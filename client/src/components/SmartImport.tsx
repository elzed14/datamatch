import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Image as ImageIcon, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { api } from '@/lib/api'

interface SmartImportProps {
  onImportComplete: (data: any) => void
}

export function SmartImport({ onImportComplete }: SmartImportProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [importType, setImportType] = useState<'pdf' | 'image' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePDFExtraction = async (file: File) => {
    setIsProcessing(true)
    setStatus('📄 Extraction du PDF en cours...')
    setProgress(20)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      setProgress(40)
      const response = await fetch(api.extractPdf, {
        method: 'POST',
        body: formData
      })

      setProgress(80)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de l\'extraction du PDF')
      }

      const result = await response.json()
      setProgress(100)
      setStatus('✅ PDF extrait avec succès !')
      
      setTimeout(() => {
        onImportComplete(result)
      }, 500)

    } catch (err: any) {
      console.error('Erreur PDF:', err)
      setError(err.message || 'Erreur lors de l\'extraction du PDF')
      setStatus('❌ Échec de l\'extraction')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImageOCR = async (file: File) => {
    setIsProcessing(true)
    setStatus('🖼️ Préparation de l\'image...')
    setProgress(10)
    setError(null)

    try {
      // Étape 1 : Optimiser l'image côté serveur
      const formData = new FormData()
      formData.append('file', file)

      const prepareResponse = await fetch(api.prepareImage, {
        method: 'POST',
        body: formData
      })

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la préparation de l\'image')
      }

      const { optimizedFilename } = await prepareResponse.json()
      setProgress(30)

      // Étape 2 : OCR avec Tesseract.js côté client
      setStatus('🔍 Reconnaissance de texte (OCR)...')
      
      const worker = await createWorker('fra+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const ocrProgress = Math.round(m.progress * 50) + 30 // 30-80%
            setProgress(ocrProgress)
          }
        }
      })

      // Utiliser l'image optimisée
      const imageUrl = api.download(optimizedFilename)
      const { data: { text } } = await worker.recognize(imageUrl)
      await worker.terminate()

      setProgress(85)
      setStatus('📊 Conversion en tableau...')

      // Étape 3 : Parser le texte en tableau
      const lines = text.split('\n').filter(line => line.trim())
      
      // Détecter les colonnes (première ligne ou détection automatique)
      const tableData: any[] = []
      
      if (lines.length > 0) {
        // Essayer de détecter un tableau
        const hasMultipleColumns = lines.some(line => {
          const parts = line.split(/\s{2,}|\t/).filter(p => p.trim())
          return parts.length >= 2
        })

        if (hasMultipleColumns) {
          // Format tableau détecté
          const headerParts = lines[0].split(/\s{2,}|\t/).filter(p => p.trim())
          const columns = headerParts.length > 0 ? headerParts : ['Colonne1', 'Colonne2']

          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(/\s{2,}|\t/).filter(p => p.trim())
            if (parts.length > 0) {
              const row: any = {}
              columns.forEach((col, idx) => {
                row[col] = parts[idx] || ''
              })
              tableData.push(row)
            }
          }
        } else {
          // Format texte simple
          lines.forEach(line => {
            tableData.push({ Texte: line })
          })
        }
      }

      setProgress(95)

      // Étape 4 : Sauvegarder en Excel
      const saveResponse = await fetch(api.saveOcrData, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: tableData,
          originalName: file.name
        })
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde')
      }

      const result = await saveResponse.json()
      setProgress(100)
      setStatus('✅ OCR terminé avec succès !')

      setTimeout(() => {
        onImportComplete(result)
      }, 500)

    } catch (err: any) {
      console.error('Erreur OCR:', err)
      setError(err.message || 'Erreur lors de l\'OCR')
      setStatus('❌ Échec de l\'OCR')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileType = file.type
    const fileName = file.name.toLowerCase()

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      await handlePDFExtraction(file)
    } else if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/)) {
      await handleImageOCR(file)
    } else {
      setError('Format de fichier non supporté. Utilisez PDF ou Image (JPG, PNG, etc.)')
    }
  }

  const triggerFileInput = (type: 'pdf' | 'image') => {
    setImportType(type)
    if (fileInputRef.current) {
      if (type === 'pdf') {
        fileInputRef.current.accept = '.pdf'
      } else {
        fileInputRef.current.accept = 'image/*,.jpg,.jpeg,.png,.gif,.bmp,.tiff'
      }
      fileInputRef.current.click()
    }
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Smart Import - PDF & Images
        </CardTitle>
        <CardDescription>
          Extrayez automatiquement des données depuis des PDF ou des images (OCR)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />

        {!isProcessing && !status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option PDF */}
            <div
              onClick={() => triggerFileInput('pdf')}
              className="p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:border-primary hover:bg-primary/5 text-center"
            >
              <FileText className="w-12 h-12 mx-auto mb-3 text-red-600" />
              <h3 className="font-semibold mb-2">Import PDF</h3>
              <p className="text-sm text-muted-foreground">
                Extrait les tableaux et texte structuré depuis un PDF
              </p>
              <div className="mt-3 text-xs text-muted-foreground">
                ✅ PDF avec tableaux<br/>
                ✅ PDF texte<br/>
                ✅ PDF scanné (OCR)
              </div>
            </div>

            {/* Option Image */}
            <div
              onClick={() => triggerFileInput('image')}
              className="p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:border-primary hover:bg-primary/5 text-center"
            >
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-blue-600" />
              <h3 className="font-semibold mb-2">Import Image (OCR)</h3>
              <p className="text-sm text-muted-foreground">
                Reconnaissance de texte depuis une image ou document scanné
              </p>
              <div className="mt-3 text-xs text-muted-foreground">
                ✅ Photos de tableaux<br/>
                ✅ Captures d'écran<br/>
                ✅ Documents scannés
              </div>
            </div>
          </div>
        )}

        {/* Progression */}
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium">{status}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              {progress}% - Veuillez patienter...
            </p>
          </div>
        )}

        {/* Succès */}
        {status && !isProcessing && !error && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">{status}</span>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-red-800">Erreur</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
            <Button
              onClick={() => {
                setError(null)
                setStatus('')
                setProgress(0)
              }}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Réessayer
            </Button>
          </div>
        )}

        {/* Conseils */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
          <p className="font-semibold mb-1">💡 Conseils pour de meilleurs résultats :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Utilisez des images nettes et bien éclairées</li>
            <li>Assurez-vous que le texte est lisible</li>
            <li>Les PDF avec tableaux donnent les meilleurs résultats</li>
            <li>L'OCR peut prendre 30-60 secondes selon la taille</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
