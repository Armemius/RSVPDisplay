import { ImportError, type ImportErrorCode } from './import-error'

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
  if (input.includes('\0')) throw new ImportError('binary')
  if (lines[0]?.trim() !== '@rsvp 1') {
    throw new ImportError('version')
  }
  const title = lines[1]?.match(/^@title\s+(.+)$/)?.[1]?.trim()
  const source = lines[2]?.match(/^@source\s+(.+)$/)?.[1]?.trim()
  if (!title || !source) {
    throw new ImportError('header')
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
    const fail = (code: ImportErrorCode, values?: Record<string, string | number>): never => {
      throw new ImportError(code, values, index + 1)
    }

    if (line.startsWith('@') && !line.startsWith('@@')) {
      const [, directive, rawValue = ''] = line.match(/^@(\S+)(?:\s+(.*))?$/) ?? []
      const value = rawValue.trim()
      switch (directive) {
        case 'author':
        case 'converter':
          if (hasText || document[directive] || !value) fail('metadata', { directive })
          document[directive] = value
          break
        case 'chapter':
          if (!value) fail('chapter')
          chapter = { title: value, paragraphs: [] }
          document.chapters.push(chapter)
          newParagraph = true
          break
        case 'para':
          if (value) fail('paragraph')
          newParagraph = true
          break
        case 'language':
          if (!value) fail('languageMissing')
          try { language = Intl.getCanonicalLocales(value)[0] }
          catch { fail('languageInvalid') }
          break
        case 'direction':
          if (value !== 'auto' && value !== 'ltr' && value !== 'rtl') fail('direction')
          direction = value as TextDirection
          break
        case 'writing-mode':
          if (value !== 'vertical-rl') fail('writingMode')
          document.writingMode = 'vertical-rl'
          break
        default:
          fail('directive', { directive: directive ?? '' })
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

  if (!document.wordCount) throw new ImportError('noText')
  return document
}

export async function readRsvpFile(file: File): Promise<{ document: RsvpDocument; raw: string }> {
  if (!file.name.toLowerCase().endsWith('.rsvp')) throw new ImportError('extension')
  if (file.size > MAX_FILE_SIZE) throw new ImportError('tooLarge')
  if (!file.size) throw new ImportError('emptyFile')
  let raw: string
  try {
    raw = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    throw new ImportError('encoding')
  }
  return { document: parseRsvp(raw), raw }
}
