import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Download, Trash2, ArrowUp, ArrowDown, Plus, CheckCircle2, AlertCircle, Loader2, Scissors, Layers } from 'lucide-react'
import { API_URL } from '@/lib/api'

const downloadUrl = (filename: string) => `${API_URL}/api/convert/download/${filename}`

// ─── Onglet Fusionner ────────────────────────────────────────────────────
function MergePdfs() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ filename: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const pdfs = Array.from(newFiles).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    setFiles(prev => [...prev, ...pdfs])
    setResult(null)
    setError(null)
  }

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))
  const moveUp = (i: number) => { if (i === 0) return; setFiles(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) }
  const moveDown = (i: number) => { if (i === files.length - 1) return; setFiles(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a }) }

  const merge = async () => {
    if (files.length < 2) return
    setLoading(true); setError(null); setResult(null)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const res = await fetch(`${API_URL}/api/pdf/merge`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => addFiles(e.target.files)} />

      <div
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center p-8 cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
      >
        <Upload className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
        <p className="font-medium text-sm">Cliquez pour ajouter des PDFs</p>
        <p className="text-xs text-muted-foreground mt-1">Plusieurs fichiers acceptés</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Ordre de fusion ({files.length} fichiers)</p>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/20">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span className="flex-1 text-sm font-medium truncate">📄 {f.name}</span>
              <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveUp(i)} disabled={i === 0}><ArrowUp className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveDown(i)} disabled={i === files.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => removeFile(i)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="gap-1">
              <Plus className="w-3 h-3" /> Ajouter
            </Button>
            <Button onClick={merge} disabled={loading || files.length < 2} className="gap-2 flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              Fusionner {files.length} PDFs
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="font-semibold text-green-800 dark:text-green-200 text-sm">{result.message}</span></div>
          <a href={downloadUrl(result.filename)} download className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            <Download className="w-4 h-4" /> Télécharger le PDF fusionné
          </a>
        </div>
      )}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4" />{error}</div>}
    </div>
  )
}

// ─── Onglet Réorganiser / Supprimer pages ────────────────────────────────
function ReorderPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pages, setPages] = useState<number[]>([]) // indices 0-based dans l'ordre voulu
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFilename, setUploadedFilename] = useState('')
  const [result, setResult] = useState<{ filename: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (f: File) => {
    setFile(f); setResult(null); setError(null); setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch(`${API_URL}/api/pdf/info`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPageCount(data.pageCount)
      setUploadedFilename(data.filename)
      setPages(Array.from({ length: data.pageCount }, (_, i) => i))
    } catch (e: any) { setError(e.message) }
    finally { setUploading(false) }
  }

  const removePage = (i: number) => setPages(prev => prev.filter((_, idx) => idx !== i))
  const moveUp = (i: number) => { if (i === 0) return; setPages(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) }
  const moveDown = (i: number) => { if (i === pages.length - 1) return; setPages(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a }) }

  const apply = async () => {
    if (!uploadedFilename || !pages.length) return
    setLoading(true); setError(null); setResult(null)
    try {
      // Re-upload le fichier original avec le nouvel ordre
      const fd = new FormData()
      fd.append('file', file!)
      fd.append('pageOrder', JSON.stringify(pages))
      const res = await fetch(`${API_URL}/api/pdf/reorder`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {!file ? (
        <div onClick={() => inputRef.current?.click()} className="flex flex-col items-center justify-center p-8 cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all">
          <Upload className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
          <p className="font-medium text-sm">Sélectionnez un PDF à modifier</p>
        </div>
      ) : uploading ? (
        <div className="flex items-center gap-2 p-4 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement du PDF...</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <span className="text-sm font-medium">📄 {file.name}</span>
            <span className="text-xs text-muted-foreground">{pageCount} pages • {pages.length} sélectionnées</span>
          </div>

          <p className="text-xs font-bold uppercase text-muted-foreground">Pages (glissez pour réorganiser, 🗑 pour supprimer)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
            {pages.map((pageIdx, i) => (
              <div key={i} className="flex items-center gap-1 p-2 rounded-lg border bg-white dark:bg-muted/20 text-sm">
                <span className="flex-1 font-medium text-center">Page {pageIdx + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveUp(i)} disabled={i === 0}><ArrowUp className="w-2.5 h-2.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveDown(i)} disabled={i === pages.length - 1}><ArrowDown className="w-2.5 h-2.5" /></Button>
                </div>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-600" onClick={() => removePage(i)}><Trash2 className="w-2.5 h-2.5" /></Button>
              </div>
            ))}
          </div>

          <Button onClick={apply} disabled={loading || pages.length === 0} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Appliquer ({pages.length} pages)
          </Button>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="font-semibold text-green-800 dark:text-green-200 text-sm">{result.message}</span></div>
          <a href={downloadUrl(result.filename)} download className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            <Download className="w-4 h-4" /> Télécharger le PDF modifié
          </a>
        </div>
      )}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4" />{error}</div>}
    </div>
  )
}

// ─── Onglet Diviser ──────────────────────────────────────────────────────
function SplitPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [ranges, setRanges] = useState<{ start: string; end: string; name: string }[]>([{ start: '1', end: '1', name: 'Partie 1' }])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<{ filename: string; name: string; pageCount: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (f: File) => {
    setFile(f); setResults([]); setError(null); setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch(`${API_URL}/api/pdf/info`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPageCount(data.pageCount)
      setRanges([{ start: '1', end: String(data.pageCount), name: 'Partie 1' }])
    } catch (e: any) { setError(e.message) }
    finally { setUploading(false) }
  }

  const addRange = () => setRanges(prev => [...prev, { start: '1', end: String(pageCount), name: `Partie ${prev.length + 1}` }])
  const removeRange = (i: number) => setRanges(prev => prev.filter((_, idx) => idx !== i))
  const updateRange = (i: number, field: string, val: string) => setRanges(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const split = async () => {
    if (!file) return
    setLoading(true); setError(null); setResults([])
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('ranges', JSON.stringify(ranges.map(r => ({ start: parseInt(r.start), end: parseInt(r.end), name: r.name }))))
      const res = await fetch(`${API_URL}/api/pdf/split`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.files)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {!file ? (
        <div onClick={() => inputRef.current?.click()} className="flex flex-col items-center justify-center p-8 cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all">
          <Upload className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
          <p className="font-medium text-sm">Sélectionnez un PDF à diviser</p>
        </div>
      ) : uploading ? (
        <div className="flex items-center gap-2 p-4 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <span className="text-sm font-medium">📄 {file.name}</span>
            <span className="text-xs text-muted-foreground">{pageCount} pages au total</span>
          </div>

          <p className="text-xs font-bold uppercase text-muted-foreground">Plages de pages à extraire</p>
          {ranges.map((r, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/10">
              <input
                className="flex-1 min-w-0 px-2 py-1 text-sm border rounded"
                placeholder="Nom"
                value={r.name}
                onChange={e => updateRange(i, 'name', e.target.value)}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Pages</span>
              <input
                className="w-16 px-2 py-1 text-sm border rounded text-center"
                type="number" min="1" max={pageCount}
                value={r.start}
                onChange={e => updateRange(i, 'start', e.target.value)}
              />
              <span className="text-xs">→</span>
              <input
                className="w-16 px-2 py-1 text-sm border rounded text-center"
                type="number" min="1" max={pageCount}
                value={r.end}
                onChange={e => updateRange(i, 'end', e.target.value)}
              />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => removeRange(i)} disabled={ranges.length === 1}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRange} className="gap-1"><Plus className="w-3 h-3" /> Ajouter une plage</Button>
            <Button onClick={split} disabled={loading} className="flex-1 gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
              Diviser en {ranges.length} fichier(s)
            </Button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground text-green-700">{results.length} fichier(s) créé(s)</p>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{r.name}</p>
                <p className="text-xs text-green-600">{r.pageCount} page(s)</p>
              </div>
              <a href={downloadUrl(r.filename)} download className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">
                <Download className="w-3 h-3" /> Télécharger
              </a>
            </div>
          ))}
        </div>
      )}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4" />{error}</div>}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────
type Tab = 'merge' | 'reorder' | 'split'

export function PdfEditor() {
  const [tab, setTab] = useState<Tab>('merge')

  const tabs: { id: Tab; label: string; icon: string; desc: string }[] = [
    { id: 'merge',   label: 'Fusionner',    icon: '🔗', desc: 'Combiner plusieurs PDFs' },
    { id: 'reorder', label: 'Modifier',     icon: '✏️', desc: 'Réorganiser / supprimer des pages' },
    { id: 'split',   label: 'Diviser',      icon: '✂️', desc: 'Extraire des pages' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📄 Éditeur PDF
          </CardTitle>
          <CardDescription>Fusionnez, modifiez et divisez vos fichiers PDF</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Onglets */}
          <div className="flex gap-2 mb-6 border-b pb-4">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                  tab === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-muted hover:border-primary/30 text-muted-foreground'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span>{t.label}</span>
                <span className="text-[10px] font-normal opacity-70">{t.desc}</span>
              </button>
            ))}
          </div>

          {tab === 'merge'   && <MergePdfs />}
          {tab === 'reorder' && <ReorderPdf />}
          {tab === 'split'   && <SplitPdf />}
        </CardContent>
      </Card>
    </div>
  )
}
