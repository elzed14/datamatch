import { useState } from 'react'
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
import { UploadCloud, FileSpreadsheet, LayoutDashboard, Database, Sparkles, AlertTriangle, BarChart3, Users, Search, Download, Gauge } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'upload' | 'powerquery' | 'tcd' | 'dashboard' | 'quality'>('upload')
  const [qualitySubTab, setQualitySubTab] = useState<'anomalies' | 'waterfall' | 'cleaner' | 'dashboard' | 'cohort' | 'search' | 'export' | 'performance'>('anomalies')
  const [powerQueryStep, setPowerQueryStep] = useState<'mapping' | 'merge'>('mapping')
  const [fileData, setFileData] = useState<UploadResponse | null>(null)
  const [file2Data, setFile2Data] = useState<UploadResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload`, {
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
      setErrorMsg(err.message || 'Erreur inconnue')
    } finally {
      if (!isSecondFile) {
        setIsUploading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">DataMatch Pro Advanced</h1>
          </div>
          <nav className="flex space-x-4">
            <Button variant={activeTab === 'upload' ? 'default' : 'ghost'} onClick={() => setActiveTab('upload')}>
              <UploadCloud className="mr-2 h-4 w-4" /> Import Excel
            </Button>
            <Button variant={activeTab === 'powerquery' ? 'default' : 'ghost'} onClick={() => setActiveTab('powerquery')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Power Query & Merge
            </Button>
            <Button variant={activeTab === 'quality' ? 'default' : 'ghost'} onClick={() => setActiveTab('quality')}>
              <Sparkles className="mr-2 h-4 w-4" /> Qualité & Analyse
            </Button>
            <Button variant={activeTab === 'tcd' ? 'default' : 'ghost'} onClick={() => setActiveTab('tcd')}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> Pivot Tables (TCD)
            </Button>
            <Button variant={activeTab === 'dashboard' ? 'default' : 'ghost'} onClick={() => setActiveTab('dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> Global Dashboard
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
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
                    <div className="flex justify-between items-center bg-muted/50 p-4 rounded-md">
                  <div>
                    <p className="font-medium text-sm">Fichier: <span className="font-normal text-muted-foreground">{fileData.originalName || fileData.filename}</span></p>
                    <p className="font-medium text-sm">Feuille: <span className="font-normal text-muted-foreground">{fileData.sheetName || 'Sheet1'}</span></p>
                    <p className="font-medium text-sm">Lignes totales: <span className="font-normal text-muted-foreground">{fileData.totalRows}</span></p>
                    <p className="font-medium text-sm">Colonnes: <span className="font-normal text-muted-foreground">{fileData.columns?.length || 0}</span></p>
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
                      <h3 className="font-bold">Aperçu des données</h3>
                      <Button onClick={() => setActiveTab('powerquery')}>Ouvrir Power Query</Button>
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
                    <UploadZone onFileSelect={handleFileUpload} isLoading={isUploading} />
                    {errorMsg && (
                      <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive">
                        {errorMsg}
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
              <Button variant={powerQueryStep === 'mapping' ? 'secondary' : 'ghost'} onClick={() => setPowerQueryStep('mapping')}>Mapping & Colonnes</Button>
              <Button variant={powerQueryStep === 'merge' ? 'secondary' : 'ghost'} onClick={() => setPowerQueryStep('merge')}>Jointure (Merge)</Button>
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
              <h2 className="text-2xl font-bold mb-2">Qualité & Analyse Avancée</h2>
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
                    onClick={() => setQualitySubTab('anomalies')}
                    size="sm"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Anomalies
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'waterfall' ? 'secondary' : 'ghost'} 
                    onClick={() => setQualitySubTab('waterfall')}
                    size="sm"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Cascade
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'cleaner' ? 'secondary' : 'ghost'} 
                    onClick={() => setQualitySubTab('cleaner')}
                    size="sm"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Nettoyage
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'dashboard' ? 'secondary' : 'ghost'} 
                    onClick={() => setQualitySubTab('dashboard')}
                    size="sm"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'cohort' ? 'secondary' : 'ghost'} 
                    onClick={() => setQualitySubTab('cohort')}
                    size="sm"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Cohortes
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'search' ? 'secondary' : 'ghost'} 
                    onClick={() => setQualitySubTab('search')}
                    size="sm"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Recherche
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'export' ? 'secondary' : 'ghost'} 
                    onClick={() => setQualitySubTab('export')}
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exports
                  </Button>
                  <Button 
                    variant={qualitySubTab === 'performance' ? 'secondary' : 'ghost'} 
                    onClick={() => setQualitySubTab('performance')}
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
                      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/download/${newFilename}`)
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
      </main>
    </div>
  )
}

export default App