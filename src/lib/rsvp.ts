export type TextDirection = 'auto' | 'ltr' | 'rtl'

export interface TextSegment {
  text: string
  language?: string
  direction: TextDirection
}

export interface Chapter {
  title: string
  paragraphs: TextSegment[][]
}

export interface RsvpDocument {
  title: string
  source: string
  author?: string
  converter?: string
  writingMode: 'horizontal-tb' | 'vertical-rl'
  chapters: Chapter[]
  wordCount: number
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const FILE_ACCEPT = '.rsvp'

/** Parse RSVP Nano v1 without rendering source content as HTML. */
export function parseRsvp(input: string): RsvpDocument {
  const lines = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')
  if (input.includes('\0')) throw new Error('This file contains binary data. Choose a UTF-8 .rsvp file.')
  if (lines[0]?.trim() !== '@rsvp 1') {
    throw new Error('The file must start with @rsvp 1. Only RSVP Nano version 1 is supported.')
  }
  const title = lines[1]?.match(/^@title\s+(.+)$/)?.[1]?.trim()
  const source = lines[2]?.match(/^@source\s+(.+)$/)?.[1]?.trim()
  if (!title || !source) {
    throw new Error('Add a non-empty @title and @source on the second and third lines.')
  }

  const document: RsvpDocument = {
    title, source, chapters: [], wordCount: 0, writingMode: 'horizontal-tb',
  }
  let language: string | undefined
  let direction: TextDirection = 'auto'
  let chapter: Chapter | undefined
  let newParagraph = true
  let hasText = false

  for (let index = 3; index < lines.length; index++) {
    const line = lines[index].trim()
    if (!line) { newParagraph = true; continue }
    const fail = (message: string): never => { throw new Error(`Line ${index + 1}: ${message}`) }

    if (line.startsWith('@') && !line.startsWith('@@')) {
      const [, directive, rawValue = ''] = line.match(/^@(\S+)(?:\s+(.*))?$/) ?? []
      const value = rawValue.trim()
      switch (directive) {
        case 'author':
        case 'converter':
          if (hasText || document[directive] || !value) fail(`@${directive} needs one non-empty value in the header.`)
          document[directive] = value
          break
        case 'chapter':
          if (!value) fail('@chapter needs a title.')
          chapter = { title: value, paragraphs: [] }
          document.chapters.push(chapter)
          newParagraph = true
          break
        case 'para':
          if (value) fail('@para does not take a value.')
          newParagraph = true
          break
        case 'language':
          if (!value) fail('@language needs a BCP 47 language tag, such as en or ru.')
          try { language = Intl.getCanonicalLocales(value)[0] }
          catch { fail('Invalid @language tag. Use a BCP 47 tag, such as en or ru.') }
          break
        case 'direction':
          if (value !== 'auto' && value !== 'ltr' && value !== 'rtl') fail('@direction must be auto, ltr, or rtl.')
          direction = value as TextDirection
          break
        case 'writing-mode':
          if (value !== 'vertical-rl') fail('Only @writing-mode vertical-rl is supported.')
          document.writingMode = 'vertical-rl'
          break
        default:
          fail(`Unsupported directive @${directive ?? ''}. To display a line starting with @, escape it as @@.`)
      }
      continue
    }

    const text = (line.startsWith('@@') ? line.slice(1) : line).replace(/\s+/g, ' ')
    if (!chapter) {
      chapter = { title, paragraphs: [] }
      document.chapters.push(chapter)
    }
    if (newParagraph || chapter.paragraphs.length === 0) chapter.paragraphs.push([])
    chapter.paragraphs.at(-1)!.push({ text, language, direction })
    document.wordCount += text.split(/\s+/u).filter(word => /[\p{L}\p{N}]/u.test(word)).length
    newParagraph = false
    hasText = true
  }

  if (!document.wordCount) throw new Error('This file has no readable text. Add content after the header.')
  return document
}

export async function readRsvpFile(file: File): Promise<{ document: RsvpDocument; raw: string }> {
  if (!file.name.toLowerCase().endsWith('.rsvp')) throw new Error('Choose a .rsvp file. Other document formats are not supported yet.')
  if (file.size > MAX_FILE_SIZE) throw new Error('This file is too large. Choose a file smaller than 10 MB.')
  if (!file.size) throw new Error('This file is empty. Choose a .rsvp file with some text.')
  let raw: string
  try {
    raw = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this file as UTF-8 text. Check its encoding and try again.')
  }
  return { document: parseRsvp(raw), raw }
}
