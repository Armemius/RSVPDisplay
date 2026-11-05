import { useRef, useState } from 'react'
import { ArrowDownToLine, ArrowRight, BookOpen, Check, CircleHelp, FileText, LoaderCircle, LockKeyhole, Plus, Upload, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FILE_ACCEPT, readRsvpFile, type RsvpDocument } from '@/lib/rsvp'
import './App.css'

type ImportedFile = { document: RsvpDocument; raw: string; name: string; size: number }
const formatNumber = new Intl.NumberFormat('en')

function App() {
  const [imported, setImported] = useState<ImportedFile | null>(null)
  const [error, setError] = useState<string | null>(null)
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
      setError('Choose one .rsvp file at a time.')
      return
    }
    const file = files[0]
    setLoading(true)
    try {
      const result = await readRsvpFile(file)
      if (id !== requestId.current) return
      setImported({ ...result, name: file.name, size: file.size })
      setChapterIndex(0)
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : 'Could not open this file. Please try again.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  async function loadExample() {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}example.rsvp`)
      if (!response.ok) throw new Error('The example could not be loaded. Please try again.')
      const file = new File([await response.blob()], 'example.rsvp', { type: 'text/plain' })
      const result = await readRsvpFile(file)
      if (id !== requestId.current) return
      setImported({ ...result, name: file.name, size: file.size })
      setChapterIndex(0)
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : 'Could not load the example.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  function clearFile() {
    requestId.current++
    setImported(null)
    setError(null)
    setLoading(false)
    setChapterIndex(0)
  }

  const chapter = imported?.document.chapters[chapterIndex]

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="RSVP Display home">
          <span className="brand-icon"><BookOpen size={21} strokeWidth={1.7} /></span>
          <span>rsvp<span className="brand-light"> / display</span></span>
        </a>
        <div className="header-actions">
          <span className="local-badge"><span /> Browser-based. Yours to keep.</span>
          <Dialog>
            <DialogTrigger render={<Button variant="ghost" size="sm" />}><CircleHelp size={16} /> <span>How it works</span></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>A space for your next read</DialogTitle>
                <DialogDescription>Import a document and check its content before reading.</DialogDescription>
              </DialogHeader>
              <ol className="help-steps">
                <li>Choose or drop one UTF-8 <code>.rsvp</code> file, up to 10 MB.</li>
                <li>Check the title, author, chapters, and text in the preview.</li>
                <li>Use the example if you want to explore the file format first.</li>
              </ol>
              <p className="help-note">This first version supports import and preview. Word-by-word RSVP playback is planned for a future update. Files stay in this tab and are cleared when you refresh.</p>
              <a className="text-link" href="https://github.com/ionutdecebal/rsvpnano/blob/main/docs/conversion/spec.md" target="_blank" rel="noreferrer">Read the RSVP Nano format specification <ArrowRight size={15} /></a>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main>
        <section className="introduction">
          <div className="eyebrow"><span /> A SPACE TO FOCUS</div>
          <h1>A little less noise.<br />A little more <span>reading.</span></h1>
          <p>Bring your words. Find your focus.<br className="mobile-break" /> Start with a file of your own.</p>
        </section>

        <section className="workspace" aria-label="Document import">
          <div className="section-heading">
            <div><span className="section-number">01</span><h2>{imported ? 'Your document' : 'Bring something to read'}</h2></div>
            <Badge variant="outline" className="version-badge">RSVP NANO · V1</Badge>
          </div>
          <input
            ref={fileInput}
            id="document-file"
            className="sr-only"
            type="file"
            accept={FILE_ACCEPT}
            aria-label="Choose an RSVP file"
            disabled={loading}
            onChange={event => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              if (files.length) void loadFiles(files)
            }}
          />

          {error && <Alert variant="destructive" className="import-error" role="alert">
            <CircleHelp size={17} />
            <AlertTitle>Couldn’t import this file</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>}

          {!imported ? <Card className="import-card">
            <CardContent className="import-layout">
              <div
                className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
                onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true) }}
                onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
                onDragLeave={event => { event.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false) } }}
                onDrop={event => {
                  event.preventDefault()
                  dragDepth.current = 0
                  setDragging(false)
                  void loadFiles(Array.from(event.dataTransfer.files))
                }}
                aria-busy={loading}
              >
                <span className="upload-icon">{loading ? <LoaderCircle className="animate-spin" size={27} /> : <Upload size={27} strokeWidth={1.5} />}</span>
                <h3>{loading ? 'Opening your document…' : dragging ? 'Your words belong here' : 'Drop your next read here'}</h3>
                <p>or choose a file from your device</p>
                <Button className="choose-button" onClick={() => fileInput.current?.click()} disabled={loading}><Plus size={17} /> Choose a file</Button>
                <span className="file-hint">.rsvp files <span>·</span> Up to 10 MB</span>
              </div>
              <aside className="import-aside">
                <span className="aside-icon"><FileText size={22} strokeWidth={1.5} /></span>
                <h3>Good words.<br />A simple format.</h3>
                <p>Import an RSVP Nano file to see your text, chapters, and document details in one place.</p>
                <div className="aside-divider" />
                <span className="try-label">JUST LOOKING AROUND?</span>
                <Button variant="ghost" className="example-button" onClick={() => void loadExample()} disabled={loading}>Try an example <ArrowRight size={16} /></Button>
                <span className="example-caption">A short read to get you started.</span>
              </aside>
            </CardContent>
          </Card> : <Card className="document-card">
            <CardContent>
              <div className="document-toolbar">
                <div className="file-identity"><span className="file-success"><Check size={20} /></span><div><strong>{imported.name}</strong><span>{(imported.size / 1024).toFixed(1)} KB · Imported successfully</span></div></div>
                <div className="document-actions">
                  <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={loading}>{loading ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />} Replace file</Button>
                  <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Remove document"><X size={17} /></Button>
                </div>
              </div>
              <div className="document-summary">
                <Badge variant="secondary">READY TO PREVIEW</Badge>
                <h3>{imported.document.title}</h3>
                {imported.document.author && <p className="document-author">by {imported.document.author}</p>}
                <div className="document-stats"><span>{formatNumber.format(imported.document.wordCount)} words</span><span>{imported.document.chapters.length} {imported.document.chapters.length === 1 ? 'chapter' : 'chapters'}</span><span>~{Math.max(1, Math.ceil(imported.document.wordCount / 250))} min at 250 wpm</span></div>
                <p className="source-line">Source: <span>{imported.document.source}</span></p>
              </div>
              <Tabs defaultValue="preview" key={imported.raw} className="preview-tabs">
                <TabsList aria-label="Document view"><TabsTrigger value="preview">Text preview</TabsTrigger><TabsTrigger value="source">File source</TabsTrigger></TabsList>
                <TabsContent value="preview">
                  {imported.document.chapters.length > 1 && <div className="chapter-list" aria-label="Chapters">
                    {imported.document.chapters.map((item, index) => <Button key={index} variant={chapterIndex === index ? 'secondary' : 'ghost'} size="sm" aria-pressed={chapterIndex === index} onClick={() => setChapterIndex(index)}>{index + 1}. {item.title}</Button>)}
                  </div>}
                  <article className={`text-preview ${imported.document.writingMode === 'vertical-rl' ? 'vertical-preview' : ''}`} aria-label="Chapter text">
                    <h4>{chapter?.title}</h4>
                    {chapter?.paragraphs.map((paragraph, index) => <p key={index}>{paragraph.map((segment, segmentIndex) => <span key={segmentIndex} lang={segment.language} dir={segment.direction}>{segment.text}{segmentIndex < paragraph.length - 1 ? ' ' : ''}</span>)}</p>)}
                    {chapter?.paragraphs.length === 0 && <p>This chapter has no text.</p>}
                  </article>
                </TabsContent>
                <TabsContent value="source"><pre className="raw-preview" tabIndex={0}>{imported.raw}</pre></TabsContent>
              </Tabs>
              <p className="preview-note"><BookOpen size={15} /> Import and preview are ready. Word-by-word playback is coming next.</p>
            </CardContent>
          </Card>}
          <p className="privacy-note"><LockKeyhole size={13} /> Your files stay in your browser. No uploads. No account needed.</p>
          <p className="sr-only" role="status">{loading ? 'Loading document.' : imported ? `${imported.document.title} imported. ${imported.document.wordCount} words.` : 'Choose a file to begin.'}</p>
        </section>

        <section className="format-section" aria-labelledby="format-heading">
          <div className="format-copy">
            <span className="eyebrow">MADE FOR YOUR WORDS</span>
            <h2 id="format-heading">Small file. Room for a whole story.</h2>
            <p>An <code>.rsvp</code> file is plain text with a few simple markers for the title, source, and chapters. Start with our template and make it your own.</p>
            <a href={`${import.meta.env.BASE_URL}example.rsvp`} download className={buttonVariants({ variant: 'outline', size: 'sm', className: 'download-button' })}><ArrowDownToLine size={15} /> Download template</a>
          </div>
          <div className="format-example" aria-label="RSVP file format example">
            <div className="code-header"><FileText size={13} /><span>your-next-read.rsvp</span><span>UTF-8</span></div>
            <pre><code><span className="code-directive">@rsvp</span> 1{'\n'}<span className="code-directive">@title</span> Your next great read{'\n'}<span className="code-directive">@source</span> my-document.txt{'\n'}<span className="code-directive">@chapter</span> The beginning{'\n'}<span className="code-text">Every good story starts with a word.</span></code></pre>
          </div>
        </section>
      </main>

      <footer className="site-footer"><span>One word at a time.</span><a href="https://github.com/ionutdecebal/rsvpnano" target="_blank" rel="noreferrer">Inspired by RSVP Nano <ArrowRight size={13} /></a></footer>
    </div>
  )
}

export default App
