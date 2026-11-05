import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { MAX_FILE_SIZE, parseRsvp, readRsvpFile } from '../src/lib/rsvp'

const header = '@rsvp 1\n@title A book\n@source book.txt\n'

describe('RSVP Nano v1 import', () => {
  it('loads the downloadable template with metadata, chapters, and escaped text', () => {
    const document = parseRsvp(readFileSync('public/example.rsvp', 'utf8'))
    expect(document.title).toBe('The Art of Paying Attention')
    expect(document.author).toBe('RSVP Display')
    expect(document.chapters.map(chapter => chapter.title)).toEqual(['A quieter kind of reading', 'One word at a time'])
    expect(document.chapters[1].paragraphs.at(-1)?.[0].text).toMatch(/^@This line/)
    expect(document.wordCount).toBeGreaterThan(100)
  })
  it('accepts UTF-8 BOM, CRLF, and a fallback chapter', () => {
    const document = parseRsvp('\uFEFF' + (header + 'Hello world.').replaceAll('\n', '\r\n'))
    expect(document.chapters[0].title).toBe('A book')
    expect(document.wordCount).toBe(2)
  })
  it('keeps paragraph boundaries and wrapped lines', () => {
    const document = parseRsvp(header + 'First line\nsecond line\n@para\nNext paragraph\n\nFinal paragraph')
    expect(document.chapters[0].paragraphs).toHaveLength(3)
    expect(document.chapters[0].paragraphs[0].map(segment => segment.text)).toEqual(['First line', 'second line'])
  })
  it('preserves language and direction changes in logical order', () => {
    const document = parseRsvp(header + '@language en\nHello\n@language ar\n@direction rtl\nمرحبا\n@language en\n@direction ltr\nAgain')
    expect(document.chapters[0].paragraphs[0]).toEqual([
      { text: 'Hello', language: 'en', direction: 'auto' },
      { text: 'مرحبا', language: 'ar', direction: 'rtl' },
      { text: 'Again', language: 'en', direction: 'ltr' },
    ])
  })
  it('handles vertical writing, CJK tokens, Unicode, and punctuation', () => {
    const document = parseRsvp(header + '@writing-mode vertical-rl\n你好世界 Привет мир 123 — !')
    expect(document.wordCount).toBe(4)
    expect(document.writingMode).toBe('vertical-rl')
  })
  it.each([
    ['', 'must start'],
    ['@rsvp 2\n@title A\n@source B\nHello', 'version 1'],
    ['@rsvp 1\n@title \n@source B\nHello', '@title and @source'],
    ['@rsvp 1\n@title A\nHello', '@title and @source'],
    [header, 'no readable text'],
    [header + '— !', 'no readable text'],
    [header + '@direction backwards\nHello', 'Line 4'],
    [header + '@language not_valid\nHello', 'Invalid @language'],
    [header + '@chapter\nHello', '@chapter needs'],
    [header + '@para extra\nHello', 'does not take a value'],
    [header + '@unknown hello\nWorld', 'Unsupported directive'],
    [header + 'Hello\n@author Author', 'in the header'],
    [header + 'Hello\0', 'binary data'],
  ])('rejects malformed input with an actionable error', (raw, message) => {
    expect(() => parseRsvp(raw)).toThrow(message)
  })
  it('checks file extension, empty files, size, and UTF-8 decoding', async () => {
    await expect(readRsvpFile(new File([header + 'Hello'], 'BOOK.RSVP'))).resolves.toMatchObject({ document: { wordCount: 1 } })
    await expect(readRsvpFile(new File(['text'], 'book.epub'))).rejects.toThrow('Choose a .rsvp')
    await expect(readRsvpFile(new File([], 'book.rsvp'))).rejects.toThrow('empty')
    await expect(readRsvpFile(new File([new Uint8Array(MAX_FILE_SIZE + 1)], 'book.rsvp'))).rejects.toThrow('too large')
    await expect(readRsvpFile(new File([new Uint8Array([0xff, 0xfe])], 'book.rsvp'))).rejects.toThrow('UTF-8')
  })
})
