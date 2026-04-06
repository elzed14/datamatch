import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '@/lib/api'

interface AnomalyDetectorProps {
  filename: string
  columns: string[]
}

interface Anomaly {
  row: number
  column: string
  value: any
  reason: string
  severity: 'low' | 'medium' | 'high'
  suggestion?: string
}

export function AnomalyDetector({ filename, columns }: AnomalyDetectorProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const numericColumns = columns.filter(col => 
    !col.toLowerCase().includes('nom') && 
    !col.toLowerCase().includes('client') &&
    !col.toLowerCase().includes('statut')
  )

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const detectAnomalies = async () => {
    if (selectedColumns.length === 0) return

    setIsAnalyzing(true)
    try {
      const response = await fetch(api.detectAnomalies, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, columns: selectedColumns })
      })

      const result = await response.json()
      if (result.success) {
        setAnomalies(result.anomalies)
        setStats(result.stats)
      }
    } catch (error) {
      console.error('Erreur détection anomalies:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300'
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴'
      case 'medium': return '🟠'
      case 'low': return '🟡'
      default: return '⚪'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Détection d'Anomalies
          </CardTitle>
          <CardDescription>
            Identifiez automatiquement les valeurs aberrantes, les incohérences et les données suspectes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Sélection des colonnes */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Colonnes à analyser</h3>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
              {numericColumns.map(col => (
                <span
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={`px-3 py-1.5 text-sm rounded-md cursor-pointer transition-all ${
                    selectedColumns.includes(col)
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'bg-background border hover:bg-muted'
                  }`}
                >
                  {col}
                </span>
              ))}
            </div>
            {selectedColumns.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedColumns.length} colonne(s) sélectionnée(s)
              </p>
            )}
          </div>

          {/* Bouton d'analyse */}
          <Button 
            onClick={detectAnomalies} 
            disabled={isAnalyzing || selectedColumns.length === 0}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? '🔍 Analyse en cours...' : '🚀 Détecter les Anomalies'}
          </Button>

          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-xs text-blue-600 font-medium">Total Lignes</div>
                <div className="text-2xl font-bold text-blue-800">{stats.totalRows}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="text-xs text-red-600 font-medium">Anomalies Critiques</div>
                <div className="text-2xl font-bold text-red-800">{stats.highSeverity || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div className="text-xs text-orange-600 font-medium">Anomalies Moyennes</div>
                <div className="text-2xl font-bold text-orange-800">{stats.mediumSeverity || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="text-xs text-yellow-600 font-medium">Anomalies Faibles</div>
                <div className="text-2xl font-bold text-yellow-800">{stats.lowSeverity || 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résultats */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anomalies Détectées ({anomalies.length})</CardTitle>
            <CardDescription>
              Triées par sévérité décroissante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.slice(0, 50).map((anomaly, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${getSeverityColor(anomaly.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getSeverityIcon(anomaly.severity)}</span>
                        <span className="font-semibold text-sm">
                          Ligne {anomaly.row} - {anomaly.column}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-white/50">
                          {anomaly.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm mb-2">
                        <span className="font-medium">Valeur : </span>
                        <span className="font-mono bg-white/50 px-2 py-0.5 rounded">
                          {String(anomaly.value)}
                        </span>
                      </div>
                      <div className="text-sm mb-2">
                        <span className="font-medium">Raison : </span>
                        {anomaly.reason}
                      </div>
                      {anomaly.suggestion && (
                        <div className="text-sm mt-2 pt-2 border-t border-current/20">
                          <span className="font-medium">💡 Suggestion : </span>
                          {anomaly.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {anomalies.length > 50 && (
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    ... et {anomalies.length - 50} autres anomalies
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aucune anomalie */}
      {anomalies.length === 0 && stats && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <h3 className="font-bold text-green-800 mb-1">Aucune anomalie détectée</h3>
            <p className="text-sm text-green-700">
              Vos données semblent cohérentes sur les colonnes analysées
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
