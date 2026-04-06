import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, Calendar } from 'lucide-react'
import { api } from '@/lib/api'

interface CohortAnalysisProps {
  filename: string
  columns: string[]
}

interface CohortData {
  cohort: string
  period: string
  value: number
  retention: number
  count: number
}

export function CohortAnalysis({ filename, columns }: CohortAnalysisProps) {
  const [cohortColumn, setCohortColumn] = useState<string>('')
  const [dateColumn, setDateColumn] = useState<string>('')
  const [valueColumn, setValueColumn] = useState<string>('')
  const [cohortData, setCohortData] = useState<CohortData[]>([])
  const [cohortMatrix, setCohortMatrix] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const dateColumns = columns.filter(col => 
    col.toLowerCase().includes('date') ||
    col.toLowerCase().includes('mois') ||
    col.toLowerCase().includes('annee') ||
    col.toLowerCase().includes('periode')
  )

  const categoryColumns = columns.filter(col => 
    col.toLowerCase().includes('client') ||
    col.toLowerCase().includes('nom') ||
    col.toLowerCase().includes('id') ||
    col.toLowerCase().includes('police')
  )

  const numericColumns = columns.filter(col => 
    col.toLowerCase().includes('ca') ||
    col.toLowerCase().includes('montant') ||
    col.toLowerCase().includes('prime')
  )

  const analyzeCohorts = async () => {
    if (!cohortColumn || !dateColumn) return

    setIsLoading(true)
    try {
      const response = await fetch(api.cohortAnalysis, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          cohortColumn,
          dateColumn,
          valueColumn: valueColumn || null
        })
      })

      const result = await response.json()
      if (result.success) {
        setCohortData(result.data)
        setCohortMatrix(result.matrix)
        setStats(result.stats)
      }
    } catch (error) {
      console.error('Erreur analyse cohortes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRetentionColor = (retention: number) => {
    if (retention >= 80) return 'bg-green-500'
    if (retention >= 60) return 'bg-green-400'
    if (retention >= 40) return 'bg-yellow-400'
    if (retention >= 20) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const getRetentionTextColor = (retention: number) => {
    if (retention >= 80) return 'text-green-700'
    if (retention >= 60) return 'text-green-600'
    if (retention >= 40) return 'text-yellow-700'
    if (retention >= 20) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Analyse de Cohortes
          </CardTitle>
          <CardDescription>
            Suivez l'évolution de groupes de clients dans le temps et analysez les taux de rétention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                <Users className="w-4 h-4 inline mr-1" />
                Identifiant Client/Entité
              </label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={cohortColumn}
                onChange={(e) => setCohortColumn(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {categoryColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Colonne Date/Période
              </label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={dateColumn}
                onChange={(e) => setDateColumn(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {dateColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Valeur (optionnel)
              </label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={valueColumn}
                onChange={(e) => setValueColumn(e.target.value)}
              >
                <option value="">Nombre uniquement</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={analyzeCohorts}
            disabled={isLoading || !cohortColumn || !dateColumn}
            className="w-full"
            size="lg"
          >
            {isLoading ? '📊 Analyse en cours...' : '🚀 Analyser les Cohortes'}
          </Button>
        </CardContent>
      </Card>

      {/* Statistiques globales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Cohortes Totales</div>
              <div className="text-3xl font-bold text-blue-600">{stats.totalCohorts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Périodes Analysées</div>
              <div className="text-3xl font-bold text-purple-600">{stats.totalPeriods}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Rétention Moyenne</div>
              <div className={`text-3xl font-bold ${getRetentionTextColor(stats.avgRetention)}`}>
                {stats.avgRetention.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Meilleure Cohorte</div>
              <div className="text-3xl font-bold text-green-600">{stats.bestCohortRetention?.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Matrice de rétention */}
      {cohortMatrix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Matrice de Rétention</CardTitle>
            <CardDescription>
              Pourcentage de rétention par cohorte et période. Plus la couleur est verte, meilleure est la rétention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-semibold bg-muted">Cohorte</th>
                    <th className="p-2 text-center font-semibold bg-muted">Taille Initiale</th>
                    {cohortMatrix[0]?.periods.map((period: string, idx: number) => (
                      <th key={idx} className="p-2 text-center font-semibold bg-muted">
                        Période {idx}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortMatrix.map((cohort, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{cohort.cohort}</td>
                      <td className="p-2 text-center font-semibold">{cohort.initialSize}</td>
                      {cohort.retentions.map((retention: number, pIdx: number) => (
                        <td key={pIdx} className="p-2 text-center">
                          <div
                            className={`inline-block px-3 py-1 rounded-md text-white font-semibold ${getRetentionColor(retention)}`}
                          >
                            {retention.toFixed(0)}%
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Légende */}
            <div className="mt-4 flex items-center gap-4 text-xs">
              <span className="font-medium">Légende :</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>≥80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span>60-79%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <span>40-59%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-400 rounded"></div>
                <span>20-39%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-400 rounded"></div>
                <span>&lt;20%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {stats && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-blue-800">💡 Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Rétention globale :</strong> {stats.avgRetention.toFixed(1)}% des clients restent actifs en moyenne.
            </p>
            {stats.avgRetention < 50 && (
              <p className="text-orange-700">
                ⚠️ <strong>Attention :</strong> Le taux de rétention est faible. Considérez des actions de fidélisation.
              </p>
            )}
            {stats.avgRetention >= 70 && (
              <p className="text-green-700">
                ✅ <strong>Excellent :</strong> Votre taux de rétention est très bon !
              </p>
            )}
            <p>
              <strong>Meilleure cohorte :</strong> {stats.bestCohortRetention?.toFixed(1)}% de rétention.
              Analysez ce qui a fonctionné pour cette cohorte.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
