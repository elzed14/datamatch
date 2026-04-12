import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UploadZone } from '@/components/UploadZone'
import { MergeModule } from '@/components/MergeModule'
import { MappingModule } from '@/components/MappingModule'
import { PivotBuilder } from '@/components/PivotBuilder'
import { Dashboard } from '@/components/Dashboard'
import { AnomalyDetector } from '@/components/AnomalyDetector'
import { WaterfallChart } from '@/components/WaterfallChart'
import { DataCleaner } from '@/components/DataCleaner'
import { CustomDashboard } from '@/components/CustomDashboard'
import { CohortAnalysis } from '@/components/CohortAnalysis'
import { GlobalSearch } from '@/components/GlobalSearch'
import { AdvancedExport } from '@/components/AdvancedExport'
import { OptimizedTable } from '@/components/OptimizedTable'
import { PerformanceMonitor } from '@/components/PerformanceMonitor'
import { SmartImport } from '@/components/SmartImport'
import { UploadCloud, FileSpreadsheet, LayoutDashboard, Database, Sparkles, AlertTriangle, BarChart3, Users, Search, Download, Gauge, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { FileConverter } from '@/components/FileConverter'
import { PdfEditor } from '@/components/PdfEditor'
import { api, fetchWithRetry, API_URL } from '@/lib/api'

interface UploadResponse {
  success: boolean
  originalName: string
  filename: string
  sheetName?: string
  columns: string[]
  previewData: Record<string, unknown>[]
  totalRows: number
}

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'powerquery' | 'tcd' | 'dashboard' | 'quality' | 'converter'>('upload')
  const [qualitySubTab, setQualitySubTab] = useState<'anomalies' | 'waterfall' | 'cleaner' | 'dashboard' | 'cohort' | 'search' | 'export' | 'performance'>('anomalies')
  const [powerQueryStep, setPowerQueryStep] = useState<'mapping' | 'merge'>('mapping')
  const [fileData, setFileData] = useState<UploadResponse | null>(null)
  const [file2Data, setFile2Data] = useState<UploadResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [serverStatus, setServerStatus] = useState<'checking' | 'ready' | 'waking'>('checking')
  const [navigationHistory, setNavigationHistory] = useState<Array<{tab: string, subTab?: string}>>([{tab: 'upload'}])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Navigation avec historique
  const navigateTo = (tab: string, subTab?: string) => {
    const newEntry = { tab, subTab }
    const newHistory = navigationHistory.slice(0, historyIndex + 1)
    newHistory.push(newEntry)
    setNavigationHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    
    setActiveTab(tab as any)
    if (subTab) setQualitySubTab(subTab as any)
  }

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const entry = navigationHistory[newIndex]
      setHistoryIndex(newIndex)
      setActiveTab(entry.tab as any)
      if (entry.subTab) setQualitySubTab(entry.subTab as any)
    }
  }

  const goForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const newIndex = historyIndex + 1
      const entry = navigationHistory[newIndex]
      setHistoryIndex(newIndex)
      setActiveTab(entry.tab as any)
      if (entry.subTab) setQualitySubTab(entry.subTab as any)
    }
  }

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < navigationHistory.length - 1

  // Wake up the server on component mount
  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        console.log('🔍 Vérification du serveur...')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 secondes pour le ping
        
        await fetch(`${API_URL}/api/health`, { 
          signal: controller.signal,
          method: 'GET'
        })
        
        clearTimeout(timeoutId)
        console.log('✅ Serveur prêt !')
        setServerStatus('ready')
      } catch (error) {
        console.log('⏳ Serveur en cours de démarrage...')
        setServerStatus('waking')
        // Le serveur va se réveiller, on met le statut à ready après 30 secondes
        setTimeout(() => setServerStatus('ready'), 30000)
      }
    }
    
    wakeUpServer()
  }, [])

  const handleFileUpload = async (file: File, isSecondFile: boolean = false) => {
    if (!isSecondFile) {
      setIsUploading(true)
    }
    setErrorMsg(null)
    
    console.log('Tentative d\'upload:', file.name, 'Taille:', file.size, 'Type:', file.type)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Envoi vers le serveur...')
      const response = await fetchWithRetry(api.upload, {
        method: 'POST',
        body: formData,
      })

      console.log('Réponse reçue:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur serveur' }))
        throw new Error(errorData.error || 'Erreur lors du traitement du fichier côté serveur.')
      }

      const result: UploadResponse = await response.json()
      console.log('Données reçues:', result)
      
      if (isSecondFile) {
        setFile2Data(result)
        setPowerQueryStep('merge')
      } else {
        setFileData(result)
      }
    } catch (err: any) {
      console.error('Erreur upload:', err)
      if (err.name === 'AbortError') {
        setErrorMsg('La requête a expiré. Le serveur met peut-être du temps à démarrer (Render free tier). Veuillez réessayer dans quelques secondes.')
      } else {
        setErrorMsg(err.message || 'Erreur inconnue')
      }
    } finally {
      if (!isSecondFile) {
        setIsUploading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">DataMatch Pro Advanced</h1>
          </div>
          
          {/* Boutons de navigation */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goBack} 
              disabled={!canGoBack}
              title="Précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goForward} 
              disabled={!canGoForward}
              title="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <nav className="flex space-x-1 overflow-x-auto">
            <Button size="sm" variant={activeTab === 'upload' ? 'default' : 'ghost'} onClick={() => navigateTo('upload')} className="font-medium whitespace-nowrap">
              <UploadCloud className="mr-1 h-4 w-4" /> Import
            </Button>
            <Button size="sm" variant={activeTab === 'powerquery' ? 'default' : 'ghost'} onClick={() => navigateTo('powerquery')} className="font-medium whitespace-nowrap">
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Power Query
            </Button>
            <Button size="sm" variant={activeTab === 'quality' ? 'default' : 'ghost'} onClick={() => navigateTo('quality', qualitySubTab)} className="font-medium whitespace-nowrap">
              <Sparkles className="mr-1 h-4 w-4" /> Qualité
            </Button>
            <Button size="sm" variant={activeTab === 'tcd' ? 'default' : 'ghost'} onClick={() => navigateTo('tcd')} className="font-medium whitespace-nowrap">
              <LayoutDashboard className="mr-1 h-4 w-4" /> TCD
            </Button>
            <Button size="sm" variant={activeTab === 'dashboard' ? 'default' : 'ghost'} onClick={() => navigateTo('dashboard')} className="font-medium whitespace-nowrap">
              <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
            </Button>
            <Button size="sm" variant={activeTab === 'converter' ? 'default' : 'ghost'} onClick={() => navigateTo('converter')} className="font-medium whitespace-nowrap">
              <RefreshCw className="mr-1 h-4 w-4" /> Convertisseur
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Server Status Banner */}
        {serverStatus === 'waking' && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  ⏳ Serveur en cours de démarrage...
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Le serveur gratuit Render s'endort après 15 minutes d'inactivité. 
                  <strong>Premier chargement : 1-5 minutes.</strong> Merci de patienter.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {serverStatus === 'ready' && activeTab === 'upload' && !fileData && (
          <div className="mb-6 p-3 bg-green-50 dark:bg-green-950/20 border border-green-400 dark:border-green-700 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ <strong>Serveur prêt !</strong> Vous pouvez maintenant importer vos fichiers.
            </p>
          </div>
        )}
        
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Importez vos données</CardTitle>
                <CardDescription>
                  Glissez et déposez vos fichiers Excel ici pour commencer l'analyse.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fileData ? (
                  <div className="space-y-4 text-left">
                    <div className="flex justify-between items-center bg-muted p-4 rounded-md border">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">Fichier: <span className="font-normal text-muted-foreground">{fileData.originalName || fileData.filename}</span></p>
                    <p className="font-semibold text-sm text-foreground">Feuille: <span className="font-normal text-muted-foreground">{fileData.sheetName || 'Sheet1'}</span></p>
                    <p className="font-semibold text-sm text-foreground">Lignes totales: <span className="font-normal text-muted-foreground">{fileData.totalRows}</span></p>
                    <p className="font-semibold text-sm text-foreground">Colonnes: <span className="font-normal text-muted-foreground">{fileData.columns?.length || 0}</span></p>
                  </div>
                      <Button onClick={() => setFileData(null)} variant="outline" size="sm">
                        Changer de fichier
                      </Button>
                    </div>
                    
                    {fileData.originalName?.includes('Fusion') && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-xs text-amber-800">
                          <strong>📊 Résultat de fusion :</strong> Ce fichier contient les données des deux fichiers fusionnés.<br/>
                          Les colonnes <span className="font-mono">(N-1)</span> proviennent du fichier 1 et <span className="font-mono">(N)</span> du fichier 2.<br/>
                          La colonne "Évolution" montre la différence entre les deux.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-foreground">Aperçu des données</h3>
                      <Button onClick={() => setActiveTab('powerquery')} className="font-medium">Ouvrir Power Query</Button>
                    </div>
                    {fileData.columns && fileData.columns.length > 0 && (
                      <OptimizedTable
                        filename={fileData.filename}
                        columns={fileData.columns}
                        totalRows={fileData.totalRows}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    {/* Smart Import - PDF & Images */}
                    <div className="mb-6">
                      <SmartImport onImportComplete={(result) => {
                        setFileData(result)
                        setErrorMsg(null)
                      }} />
                    </div>

                    {/* Séparateur */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-background text-muted-foreground font-medium">OU</span>
                      </div>
                    </div>

                    {/* Upload Excel classique */}
                    <UploadZone onFileSelect={handleFileUpload} isLoading={isUploading} />
                    {errorMsg && (
                      <div className="mt-4 p-4 bg-destructive/10 text-destructive text-sm rounded-md border-2 border-destructive">
                        <p className="font-semibold mb-1">⚠️ Erreur</p>
                        <p>{errorMsg}</p>
                        {errorMsg.includes('expiré') && (
                          <p className="mt-2 text-xs">
                            💡 <strong>Astuce :</strong> Le serveur gratuit Render s'endort après 15 minutes d'inactivité. 
                            Le premier chargement peut prendre 30-60 secondes. Merci de patienter et de réessayer.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'powerquery' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex space-x-2 border-b pb-2">
              <Button variant={powerQueryStep === 'mapping' ? 'default' : 'ghost'} onClick={() => setPowerQueryStep('mapping')} className="font-medium">Mapping & Colonnes</Button>
              <Button variant={powerQueryStep === 'merge' ? 'default' : 'ghost'} onClick={() => setPowerQueryStep('merge')} className="font-medium">Jointure (Merge)</Button>
            </div>

            {!fileData ? (
               <p className="text-muted-foreground p-4 bg-muted/50 rounded-md">Veuillez d'abord importer un fichier dans l'onglet "Import Excel".</p>
            ) : powerQueryStep === 'mapping' ? (
                <MappingModule
                  filename={fileData.filename}
                  columns={fileData.columns}
                  previewData={fileData.previewData}
                  onFileUpdate={(newFileData) => setFileData(prev => ({ ...prev, ...newFileData }))}
                  onMappingComplete={() => {
                    setActiveTab('tcd')
                  }}
                />
            ) : (
                <MergeModule
                  file1Name={fileData.originalName || fileData.filename}
                  file1ServerName={fileData.filename}
                  file1Columns={fileData.columns}
                  file2Data={file2Data}
                  onAddAnotherFile={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.xlsx,.xls'
                    input.onchange = (e: Event) => {
                      const target = e.target as HTMLInputElement
                      if (target.files?.length) handleFileUpload(target.files[0], true)
                    }
                    input.click()
                  }}
                  onMergeComplete={(merged) => {
                    setFileData({
                      success: true,
                      ...merged,
                      sheetName: 'Merged',
                      originalName: 'Fusion (' + (fileData.originalName || fileData.filename) + ')'
                    })
                  }}
                  onGoToMapping={() => {
                    setPowerQueryStep('mapping')
                  }}
                />
            )}
          </div>
        )}

        {activeTab === 'tcd' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold mb-4">Tableau Croisé Dynamique</h2>
            {!fileData ? (
               <p className="text-muted-foreground p-4 bg-muted/50 rounded-md">Veuillez d'abord importer un fichier dans l'onglet "Import Excel".</p>
            ) : (
               <PivotBuilder columns={fileData.columns} filename={fileData.filename} />
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold mb-2">Global Dashboard</h2>
            {!fileData ? (
               <p className="text-muted-foreground p-4 bg-muted/50 rounded-md">Veuillez d'abord importer un fichier dans l'onglet "Import Excel".</p>
            ) : (
              <Dashboard
                columns={fileData.columns}
                filename={fileData.filename}
              />
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">Qualité & Analyse Avancée</h2>
              <p className="text-muted-foreground mb-6">Outils d'analyse et d'amélioration de la qualité des données</p>
            </div>

            {!fileData ? (
               <p className="text-muted-foreground p-4 bg-muted/50 rounded-md">Veuillez d'abord importer un fichier dans l'onglet "Import Excel".</p>
            ) : (
              <>
                {/* Sous-navigation */}
                <div className="flex space-x-2 border-b pb-2 overflow-x-auto">
                  <Button 
                    variant={qualitySubTab === 'anomalies' ? 'secondary' : 'ghost'} 
                    onClick={() => navigateTo('quality', 'anomalies')}
                    size="sm"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Anomalies
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'waterfall' ? 'secondary' : 'ghost'} 
                    onClick={() => navigateTo('quality', 'waterfall')}
                    size="sm"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Cascade
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'cleaner' ? 'secondary' : 'ghost'} 
                    onClick={() => navigateTo('quality', 'cleaner')}
                    size="sm"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Nettoyage
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'dashboard' ? 'secondary' : 'ghost'} 
                    onClick={() => navigateTo('quality', 'dashboard')}
                    size="sm"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'cohort' ? 'secondary' : 'ghost'} 
                    onClick={() => navigateTo('quality', 'cohort')}
                    size="sm"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Cohortes
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'search' ? 'secondary' : 'ghost'} 
                    onClick={() => navigateTo('quality', 'search')}
                    size="sm"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Recherche
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'export' ? 'secondary' : 'ghost'} 
                    onClick={() => navigateTo('quality', 'export')}
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exports
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'performance' ? 'secondary' : 'ghost'} 
                    onClick={() => navigateTo('quality', 'performance')}
                    size="sm"
                  >
                    <Gauge className="mr-2 h-4 w-4" />
                    Performance
                  </Button>
                </div>

                {/* Contenu */}
                {qualitySubTab === 'anomalies' && (
                  <AnomalyDetector
                    filename={fileData.filename}
                    columns={fileData.columns}
                  />
                )}

                {qualitySubTab === 'waterfall' && (
                  <WaterfallChart
                    filename={fileData.filename}
                    columns={fileData.columns}
                  />
                )}

                {qualitySubTab === 'cleaner' && (
                  <DataCleaner
                    filename={fileData.filename}
                    columns={fileData.columns}
                    onCleanComplete={(newFilename) => {
                      fetch(api.download(newFilename))
                        .then(() => {
                          setFileData(prev => prev ? { ...prev, filename: newFilename } : null)
                        })
                    }}
                  />
                )}

                {qualitySubTab === 'dashboard' && (
                  <CustomDashboard
                    filename={fileData.filename}
                    columns={fileData.columns}
                  />
                )}

                {qualitySubTab === 'cohort' && (
                  <CohortAnalysis
                    filename={fileData.filename}
                    columns={fileData.columns}
                  />
                )}

                {qualitySubTab === 'search' && (
                  <GlobalSearch
                    filename={fileData.filename}
                    columns={fileData.columns}
                  />
                )}

                {qualitySubTab === 'export' && (
                  <AdvancedExport
                    filename={fileData.filename}
                    columns={fileData.columns}
                  />
                )}

                {qualitySubTab === 'performance' && (
                  <PerformanceMonitor />
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 'converter' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <FileConverter />
            <PdfEditor />
          </div>
        )}
      </main>
    </div>
  )
}

export default App