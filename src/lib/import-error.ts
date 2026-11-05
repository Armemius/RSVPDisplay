export type ImportErrorCode =
  | 'multipleFiles' | 'openFile' | 'binary' | 'version' | 'header'
  | 'metadata' | 'chapter' | 'paragraph' | 'languageMissing' | 'languageInvalid'
  | 'direction' | 'writingMode' | 'directive' | 'noText' | 'extension'
  | 'tooLarge' | 'emptyFile' | 'encoding'

/** Keep machine-readable error details so a visible error can change language. */
export class ImportError extends Error {
  readonly code: ImportErrorCode
  readonly values: Record<string, string | number>
  readonly line?: number

  constructor(code: ImportErrorCode, values: Record<string, string | number> = {}, line?: number) {
    super(code)
    this.name = 'ImportError'
    this.code = code
    this.values = values
    this.line = line
  }
}
