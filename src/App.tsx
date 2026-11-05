import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle, Upload, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FILE_ACCEPT, readRsvpFile, type RsvpDocument } from '@/lib/rsvp'
import { ImportError } from '@/lib/import-error'
import './App.css'

function App() {
  const { t, i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'en'
    document.documentElement.dir = i18n.dir()
    document.title = t('meta.title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'))
  }, [i18n, t])

  const [book, setBook] = useState<RsvpDocument | null>(null)
  const [error, setError] = useState<ImportError | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [chapterIndex, setChapterIndex] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const dragDepth = useRef(0)

  async function loadFiles(files: File[]) {
    const id = ++requestId.current
    setError(null)
    if (files.length !== 1) {
      setLoading(false)
      setError(new ImportError('multipleFiles'))
      return
    }
    setLoading(true)
    try {
      const { document } = await readRsvpFile(files[0])
      if (id !== requestId.current) return
      setBook(document)
      setChapterIndex(0)
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof ImportError ? cause : new ImportError('openFile'))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  function clearFile() {
    requestId.current++
    setBook(null)
    setError(null)
    setLoading(false)
    setChapterIndex(0)
  }

  const chapter = book?.chapters[chapterIndex]
  const errorMessage = error ? t(`errors.${error.code}`, error.values) : ''

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label={t('common.home')}>rsvp<span>/ display</span></a>
        <div className="header-actions">
          {book && <>
            <Button variant="ghost" size="icon" onClick={() => fileInput.current?.click()} disabled={loading} aria-label={t('document.replace')} title={t('document.replace')}>
              {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={clearFile} aria-label={t('document.remove')} title={t('document.remove')}><X size={16} /></Button>
          </>}
          <label className="language-switcher">
            <span className="sr-only">{t('language.label')}</span>
            <select value={i18n.resolvedLanguage ?? 'en'} onChange={event => void i18n.changeLanguage(event.target.value)}>
              <option value="en" lang="en">EN</option>
              <option value="ru" lang="ru">РУ</option>
            </select>
          </label>
        </div>
      </header>

      <input
        ref={fileInput}
        id="document-file"
        className="sr-only"
        type="file"
        accept={FILE_ACCEPT}
        aria-label={t('import.inputLabel')}
        tabIndex={-1}
        disabled={loading}
        onChange={event => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length) void loadFiles(files)
        }}
      />

      <main
        className={`workspace ${book ? '' : 'is-empty'} ${dragging ? 'is-dragging' : ''}`}
        aria-label={t('import.label')}
        aria-busy={loading}
        onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true) }}
        onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
        onDragLeave={event => { event.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false) } }}
        onDrop={event => {
          event.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          void loadFiles(Array.from(event.dataTransfer.files))
        }}
      >
        <div className="viewer-container">
          {error && <Alert variant="destructive" className="import-error" role="alert">
            <AlertDescription>{error.line ? t('errors.atLine', { line: error.line, message: errorMessage }) : errorMessage}</AlertDescription>
          </Alert>}

          {!book ? <section className="drop-zone" aria-label={t('import.label')}>
            {loading ? <LoaderCircle className="drop-icon animate-spin" size={24} /> : <Upload className="drop-icon" size={24} strokeWidth={1.4} />}
            <h1>{t(loading ? 'import.opening' : 'import.drop')}</h1>
            <Button variant="outline" className="choose-button" onClick={() => fileInput.current?.click()} disabled={loading}>{t('import.choose')}</Button>
            <p className="file-hint">{t('import.fileSize', { size: 10 })}</p>
          </section> : <section className="viewer">
            <div className="document-heading">
              <h1>{book.title}</h1>
              {book.author && <p className="document-author">{t('document.author', { author: book.author })}</p>}
            </div>
            {book.chapters.length > 1 && <select
              className="chapter-select"
              aria-label={t('document.chaptersLabel')}
              value={chapterIndex}
              onChange={event => { setChapterIndex(Number(event.target.value)); window.scrollTo(0, 0) }}
            >
              {book.chapters.map((item, index) => <option key={index} value={index}>{index + 1}. {item.title}</option>)}
            </select>}
            <article className={`text-preview ${book.writingMode === 'vertical-rl' ? 'vertical-preview' : ''}`} aria-label={t('document.chapterLabel')}>
              {chapter && (book.chapters.length > 1 || chapter.title !== book.title) && <h2>{chapter.title}</h2>}
              {chapter?.paragraphs.map((paragraph, index) => <p key={index}>{paragraph.map((segment, segmentIndex) => <span key={segmentIndex} lang={segment.language} dir={segment.direction}>{segment.text}{segmentIndex < paragraph.length - 1 ? ' ' : ''}</span>)}</p>)}
              {chapter?.paragraphs.length === 0 && <p className="empty-chapter">{t('document.emptyChapter')}</p>}
            </article>
          </section>}
        </div>
        <p className="sr-only" role="status">{loading ? t('import.loadingStatus') : book ? t('import.loadedStatus', { title: book.title, words: t('document.words', { count: book.wordCount }) }) : t('import.emptyStatus')}</p>
      </main>
    </div>
  )
}

export default App
