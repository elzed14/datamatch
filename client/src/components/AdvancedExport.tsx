import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, FileJson, FileText, Image, Settings } from 'lucide-react'

interface AdvancedExportProps {
  filename: string
  columns: string[]
  data?: any[]
}

interface ExportTemplate {
  id: string
  name: string
  description: string
  icon: string
  format: 'excel' | 'csv' | 'json' | 'pdf'
  options: {
    includeHeader?: boolean
    includeFooter?: boolean
    includeCharts?: boolean
    includeStats?: boolean
    styling?: 'basic' | 'professional' | 'corporate'
    logo?: boolean
  }
}

const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'basic-excel',
    name: 'Excel Basique',
    description: 'Export simple sans mise en forme',
    icon: '📄',
    format: 'excel',
    options: { includeHeader: true, styling: 'basic' }
  },
  {
    id: 'professional-excel',
    name: 'Excel Professionnel',
    description: 'Avec en-tête, pied de page et graphiques',
    icon: '📊',
    format: 'excel',
    options: { 
      includeHeader: true, 
      includeFooter: true, 
      includeCharts: true,
      includeStats: true,
      styling: 'professional' 
    }
  },
  {
    id: 'corporate-excel',
    name: 'Excel Corporate',
    description: 'Template entreprise avec logo et branding',
    icon: '🏢',
    format: 'excel',
    options: { 
      includeHeader: true, 
      includeFooter: true, 
      includeCharts: true,
      includeStats: true,
      styling: 'corporate',
      logo: true
    }
  },
  {
    id: 'csv-standard',
    name: 'CSV Standard',
    description: 'Format CSV compatible universel',
    icon: '📋',
    format: 'csv',
    options: { includeHeader: true }
  },
  {
    id: 'json-structured',
    name: 'JSON Structuré',
    description: 'Format JSON avec métadonnées',
    icon: '{ }',
    format: 'json',
    options: { includeStats: true }
  }
]

export function AdvancedExport({ filename, columns, data }: AdvancedExportProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'json' | 'pdf'>('excel')
  const [isExporting, setIsExporting] = useState(false)
  const [customOptions, setCustomOptions] = useState({
    delimiter: ',',
    encoding: 'UTF-8',
    includeIndex: false,
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'fr-FR',
    sheetName: 'Données',
    fileName: 'export',
    includeMetadata: true,
    compressJSON: false
  })

  const [chartOptions, setChartOptions] = useState({
    includeCharts: false,
    chartType: 'bar',
    chartColumn: '',
    chartTitle: 'Analyse des Données'
  })

  const handleExport = async (templateId?: string) => {
    setIsExporting(true)
    try {
      const template = templateId ? EXPORT_TEMPLATES.find(t => t.id === templateId) : null
      const format = template?.format || exportFormat

      const response = await fetch('http://localhost:3001/api/export-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          format,
          template: template?.id,
          options: {
            ...customOptions,
            ...(template?.options || {}),
            chartOptions: chartOptions.includeCharts ? chartOptions : null
          }
        })
      })

      if (!response.ok) throw new Error('Erreur lors de l\'export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const extension = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : format === 'json' ? 'json' : 'pdf'
      a.download = `${customOptions.fileName}_${Date.now()}.${extension}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur export:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportChartAsImage = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('http://localhost:3001/api/export-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          chartType: chartOptions.chartType,
          column: chartOptions.chartColumn,
          title: chartOptions.chartTitle,
          format: 'png',
          width: 1920,
          height: 1080
        })
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chart_${Date.now()}.png`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur export graphique:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const numericColumns = columns.filter(col => 
    col.toLowerCase().includes('ca') ||
    col.toLowerCase().includes('montant') ||
    col.toLowerCase().includes('prime') ||
    col.toLowerCase().includes('quantite')
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Exports Avancés
          </CardTitle>
          <CardDescription>
            Exportez vos données dans différents formats avec templates personnalisés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Templates prédéfinis */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Templates Prédéfinis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {EXPORT_TEMPLATES.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-muted hover:border-muted-foreground/40'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExport(template.id)
                      }}
                      disabled={isExporting}
                      size="sm"
                      className="w-full"
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Exporter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export personnalisé */}
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Export Personnalisé
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Format */}
              <div>
                <label className="text-sm font-medium mb-2 block">Format d'export</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'excel', icon: FileSpreadsheet, label: 'Excel' },
                    { value: 'csv', icon: FileText, label: 'CSV' },
                    { value: 'json', icon: FileJson, label: 'JSON' }
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setExportFormat(value as any)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        exportFormat === value
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-muted-foreground/40'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-xs">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nom du fichier</label>
                  <input
                    type="text"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={customOptions.fileName}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, fileName: e.target.value }))}
                    placeholder="export"
                  />
                </div>

                {exportFormat === 'excel' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nom de la feuille</label>
                    <input
                      type="text"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={customOptions.sheetName}
                      onChange={(e) => setCustomOptions(prev => ({ ...prev, sheetName: e.target.value }))}
                      placeholder="Données"
                    />
                  </div>
                )}

                {exportFormat === 'csv' && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Délimiteur</label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={customOptions.delimiter}
                        onChange={(e) => setCustomOptions(prev => ({ ...prev, delimiter: e.target.value }))}
                      >
                        <option value=",">Virgule (,)</option>
                        <option value=";">Point-virgule (;)</option>
                        <option value="\t">Tabulation</option>
                        <option value="|">Pipe (|)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Encodage</label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={customOptions.encoding}
                        onChange={(e) => setCustomOptions(prev => ({ ...prev, encoding: e.target.value }))}
                      >
                        <option value="UTF-8">UTF-8</option>
                        <option value="ISO-8859-1">ISO-8859-1</option>
                        <option value="Windows-1252">Windows-1252</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Options de graphiques */}
              {exportFormat === 'excel' && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="includeCharts"
                      checked={chartOptions.includeCharts}
                      onChange={(e) => setChartOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="includeCharts" className="text-sm font-medium">
                      Inclure des graphiques
                    </label>
                  </div>

                  {chartOptions.includeCharts && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Type de graphique</label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={chartOptions.chartType}
                          onChange={(e) => setChartOptions(prev => ({ ...prev, chartType: e.target.value }))}
                        >
                          <option value="bar">Barres</option>
                          <option value="line">Ligne</option>
                          <option value="pie">Camembert</option>
                          <option value="area">Aires</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Colonne de données</label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={chartOptions.chartColumn}
                          onChange={(e) => setChartOptions(prev => ({ ...prev, chartColumn: e.target.value }))}
                        >
                          <option value="">Sélectionner...</option>
                          {numericColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Titre du graphique</label>
                        <input
                          type="text"
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={chartOptions.chartTitle}
                          onChange={(e) => setChartOptions(prev => ({ ...prev, chartTitle: e.target.value }))}
                          placeholder="Analyse des Données"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Options JSON */}
              {exportFormat === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeMetadata"
                      checked={customOptions.includeMetadata}
                      onChange={(e) => setCustomOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="includeMetadata" className="text-sm">
                      Inclure les métadonnées (date, colonnes, statistiques)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="compressJSON"
                      checked={customOptions.compressJSON}
                      onChange={(e) => setCustomOptions(prev => ({ ...prev, compressJSON: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="compressJSON" className="text-sm">
                      Compresser le JSON (minifié)
                    </label>
                  </div>
                </div>
              )}

              <Button
                onClick={() => handleExport()}
                disabled={isExporting}
                className="w-full"
                size="lg"
              >
                {isExporting ? '⏳ Export en cours...' : '🚀 Exporter avec Options Personnalisées'}
              </Button>
            </CardContent>
          </Card>

          {/* Export de graphiques en haute résolution */}
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4 text-purple-600" />
                Export de Graphiques (Haute Résolution)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type de graphique</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={chartOptions.chartType}
                    onChange={(e) => setChartOptions(prev => ({ ...prev, chartType: e.target.value }))}
                  >
                    <option value="bar">Barres</option>
                    <option value="line">Ligne</option>
                    <option value="pie">Camembert</option>
                    <option value="area">Aires</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Colonne de données</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={chartOptions.chartColumn}
                    onChange={(e) => setChartOptions(prev => ({ ...prev, chartColumn: e.target.value }))}
                  >
                    <option value="">Sélectionner...</option>
                    {numericColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={exportChartAsImage}
                disabled={isExporting || !chartOptions.chartColumn}
                variant="outline"
                className="w-full"
              >
                <Image className="w-4 h-4 mr-2" />
                Exporter en PNG (1920x1080)
              </Button>

              <p className="text-xs text-muted-foreground">
                💡 Le graphique sera exporté en haute résolution (Full HD) pour vos présentations
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
