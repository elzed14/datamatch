import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Download, RefreshCw, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'

// Matrice des conversions supportées
const CONVERSIONS: Record<string, { label: string; icon: string; targets: { format: string; label: string; desc: string }[] }> = {
  docx: {
    label: 'Word (.docx)',
    icon: '📝',
    targets: [
      { format: 'pdf',  label: 'PDF',        desc: 'Document portable haute qualité' },
      { format: 'xlsx', label: 'Excel',       desc: 'Tableau structuré' },
      { format: 'txt',  label: 'Texte brut',  desc: 'Texte sans mise en forme' },
    ]
  },
  doc: {
    label: 'Word (.doc)',
    icon: '📝',
    targets: [
      { format: 'pdf',  label: 'PDF',        desc: 'Document portable' },
      { format: 'txt',  label: 'Texte brut',  desc: 'Texte sans mise en forme' },
    ]
  },
  pdf: {
    label: 'PDF',
    icon: '📄',
    targets: [
      { format: 'xlsx', label: 'Excel',       desc: 'Extraction des tableaux' },
      { format: 'docx', label: 'Word',        desc: 'Document éditable' },
      { format: 'txt',  label: 'Texte brut',  desc: 'Extraction du texte' },
    ]
  },
  xlsx: {
    label: 'Excel (.xlsx)',
    icon: '📊',
    targets: [
      { format: 'pdf',  label: 'PDF',         desc: 'Rapport imprimable' },
      { format: 'csv',  label: 'CSV',         desc: 'Compatible tous logiciels' },
      { format: 'json', label: 'JSON',        desc: 'Format développeur' },
      { format: 'docx', label: 'Word',        desc: 'Tableau dans document' },
    ]
  },
  xls: {
    label: 'Excel (.xls)',
    icon: '📊',
    targets: [
      { format: 'pdf',  label: 'PDF',         desc: 'Rapport imprimable' },
      { format: 'csv',  label: 'CSV',         desc: 'Compatible tous logiciels' },
      { format: 'json', label: 'JSON',        desc: 'Format développeur' },
    ]
  },
  csv: {
    label: 'CSV',
    icon: '📋',
    targets: [
      { format: 'xlsx', label: 'Excel',       desc: 'Avec mise en forme' },
      { format: 'json', label: 'JSON',        desc: 'Format développeur' },
    ]
  },
  jpg: {
    label: 'Image JPG',
    icon: '🖼️',
    targets: [
      { format: 'pdf',  label: 'PDF',         desc: 'Image dans document' },
      { format: 'png',  label: 'PNG',         desc: 'Sans perte de qualité' },
      { format: 'webp', label: 'WebP',        desc: 'Format web optimisé' },
    ]
  },
  jpeg: {
    label: 'Image JPEG',
    icon: '🖼️',
    targets: [
      { format: 'pdf',  label: 'PDF',         desc: 'Image dans document' },
      { format: 'png',  label: 'PNG',         desc: 'Sans perte de qualité' },
      { format: 'webp', label: 'WebP',        desc: 'Format web optimisé' },
    ]
  },
  png: {
    label: 'Image PNG',
    icon: '🖼️',
    targets: [
      { format: 'pdf',  label: 'PDF',         desc: 'Image dans document' },
      { format: 'jpg',  label: 'JPG',         desc: 'Compression optimisée' },
      { format: 'webp', label: 'WebP',        desc: 'Format web optimisé' },
    ]
  },
}

const FORMAT_COLORS: Record<string, string> = {
  pdf:  'bg-red-100 text-red-700 border-red-200',
  xlsx: 'bg-green-100 text-green-700 border-green-200',
  docx: 'bg-blue-100 text-blue-700 border-blue-200',
  csv:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  json: 'bg-purple-100 text-purple-700 border-purple-200',
  txt:  'bg-gray-100 text-gray-700 border-gray-200',
  png:  'bg-cyan-100 text-cyan-700 border-cyan-200',
  jpg:  'bg-orange-100 text-orange-700 border-orange-200',
  webp: 'bg-teal-100 text-teal-700 border-teal-200',
}

export function FileConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [fileExt, setFileExt] = useState<string>('')
  const [targetFormat, setTargetFormat] = useState<string>('')
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ filename: string; message: string; targetFormat: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase() || ''
    setFile(f)
    setFileExt(ext)
    setTargetFormat('')
    setResult(null)
    setError(null)
  }

  const handleConvert = async () => {
    if (!file || !targetFormat) return
    setIsConverting(true)
    setError(null)
    setResult(null)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('targetFormat', targetFormat)

      setProgress(30)
      const response = await fetch(api.convert, { method: 'POST', body: formData })
      setProgress(80)

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur lors de la conversion')
      }

      const data = await response.json()
      setProgress(100)
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue')
    } finally {
      setIsConverting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFileExt('')
    setTargetFormat('')
    setResult(null)
    setError(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const conversionInfo = CONVERSIONS[fileExt]
  const acceptedTypes = Object.keys(CONVERSIONS).map(e => `.${e}`).join(',')

  return (
    <div className="space-y-6">
      {/* Zone de drop */}
      <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Convertisseur de Fichiers Intelligent
          </CardTitle>
          <CardDescription>
            Convertissez vos fichiers entre différents formats avec la meilleure qualité possible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input ref={fileInputRef} type="file" className="hidden" accept={acceptedTypes} onChange={handleFileSelect} />

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-12 cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <Upload className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="font-semibold text-foreground mb-1">Cliquez ou glissez votre fichier ici</p>
              <p className="text-sm text-muted-foreground">Word, PDF, Excel, CSV, Images</p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {['📝 Word', '📄 PDF', '📊 Excel', '📋 CSV', '🖼️ Image'].map(f => (
                  <span key={f} className="px-3 py-1 rounded-full bg-muted text-xs font-medium">{f}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Fichier sélectionné */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
                <div className="text-4xl">{conversionInfo?.icon || '📁'}</div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {conversionInfo?.label || fileExt.toUpperCase()} • {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>✕</Button>
              </div>

              {/* Sélection du format cible */}
              {conversionInfo ? (
                <div>
                  <p className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                    Convertir vers :
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {conversionInfo.targets.map(target => (
                      <div
                        key={target.format}
                        onClick={() => setTargetFormat(target.format)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                          targetFormat === target.format
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-muted hover:border-primary/40'
                        }`}
                      >
                        <div className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border mb-2 ${FORMAT_COLORS[target.format] || 'bg-gray-100 text-gray-700'}`}>
                          .{target.format.toUpperCase()}
                        </div>
                        <p className="font-semibold text-sm">{target.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{target.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    ⚠️ Format <strong>.{fileExt}</strong> non supporté. Formats acceptés : Word, PDF, Excel, CSV, JPG, PNG
                  </p>
                </div>
              )}

              {/* Aperçu de la conversion */}
              {targetFormat && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${FORMAT_COLORS[fileExt] || 'bg-gray-100 text-gray-700'}`}>
                    .{fileExt.toUpperCase()}
                  </span>
                  <ArrowRight className="w-5 h-5 text-indigo-500" />
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${FORMAT_COLORS[targetFormat] || 'bg-gray-100 text-gray-700'}`}>
                    .{targetFormat.toUpperCase()}
                  </span>
                  <span className="text-xs text-indigo-700 dark:text-indigo-300 ml-2">
                    {conversionInfo?.targets.find(t => t.format === targetFormat)?.desc}
                  </span>
                </div>
              )}

              {/* Progression */}
              {isConverting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">Conversion en cours...</span>
                    <span className="text-xs text-muted-foreground ml-auto">{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Résultat */}
              {result && !isConverting && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">Conversion réussie !</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">{result.message}</p>
                  <div className="flex gap-2">
                    <a
                      href={api.download(result.filename)}
                      download={result.filename}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger .{result.targetFormat.toUpperCase()}
                    </a>
                    <Button variant="outline" size="sm" onClick={reset}>
                      Nouvelle conversion
                    </Button>
                  </div>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-800 text-sm">Erreur de conversion</span>
                  </div>
                  <p className="text-sm text-red-700">{error}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>Réessayer</Button>
                </div>
              )}

              {/* Bouton de conversion */}
              {!result && !isConverting && targetFormat && (
                <Button onClick={handleConvert} size="lg" className="w-full gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Convertir {file.name} → .{targetFormat.toUpperCase()}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tableau des conversions supportées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Conversions Supportées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(CONVERSIONS).map(([ext, info]) => (
              <div key={ext} className="p-3 rounded-lg border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className="font-semibold text-sm">{info.label}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {info.targets.map(t => (
                    <span key={t.format} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${FORMAT_COLORS[t.format] || 'bg-gray-100'}`}>
                      → .{t.format.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
