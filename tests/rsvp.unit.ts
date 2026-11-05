import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ImportError } from '../src/lib/import-error'
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
    ['', 'version', undefined],
    ['@rsvp 2\n@title A\n@source B\nHello', 'version', undefined],
    ['@rsvp 1\n@title \n@source B\nHello', 'header', undefined],
    ['@rsvp 1\n@title A\nHello', 'header', undefined],
    [header, 'noText', undefined],
    [header + '— !', 'noText', undefined],
    [header + '@direction backwards\nHello', 'direction', 4],
    [header + '@language not_valid\nHello', 'languageInvalid', 4],
    [header + '@chapter\nHello', 'chapter', 4],
    [header + '@para extra\nHello', 'paragraph', 4],
    [header + '@unknown hello\nWorld', 'directive', 4],
    [header + 'Hello\n@author Author', 'metadata', 5],
    [header + 'Hello\0', 'binary', undefined],
  ])('rejects malformed input with a structured error', (raw, code, line) => {
    let error: unknown
    try { parseRsvp(raw as string) } catch (cause) { error = cause }
    expect(error).toBeInstanceOf(ImportError)
    expect(error).toMatchObject({ code, line })
  })
  it('checks file extension, empty files, size, and UTF-8 decoding', async () => {
    await expect(readRsvpFile(new File([header + 'Hello'], 'BOOK.RSVP'))).resolves.toMatchObject({ document: { wordCount: 1 } })
    await expect(readRsvpFile(new File(['text'], 'book.epub'))).rejects.toMatchObject({ code: 'extension' })
    await expect(readRsvpFile(new File([], 'book.rsvp'))).rejects.toMatchObject({ code: 'emptyFile' })
    await expect(readRsvpFile(new File([new Uint8Array(MAX_FILE_SIZE + 1)], 'book.rsvp'))).rejects.toMatchObject({ code: 'tooLarge' })
    await expect(readRsvpFile(new File([new Uint8Array([0xff, 0xfe])], 'book.rsvp'))).rejects.toMatchObject({ code: 'encoding' })
  })
})
