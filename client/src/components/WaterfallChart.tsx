import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { api } from '@/lib/api'

interface WaterfallChartProps {
  filename: string
  columns: string[]
}

export function WaterfallChart({ filename, columns }: WaterfallChartProps) {
  const [categoryColumn, setCategoryColumn] = useState<string>('')
  const [valueColumn, setValueColumn] = useState<string>('')
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const textColumns = columns.filter(col => 
    col.toLowerCase().includes('nom') || 
    col.toLowerCase().includes('client') ||
    col.toLowerCase().includes('statut') ||
    col.toLowerCase().includes('type')
  )

  const numericColumns = columns.filter(col => 
    col.toLowerCase().includes('ca') ||
    col.toLowerCase().includes('montant') ||
    col.toLowerCase().includes('prime') ||
    col.toLowerCase().includes('evolution') ||
    col.toLowerCase().includes('écart')
  )

  const generateWaterfall = async () => {
    if (!categoryColumn || !valueColumn) return

    setIsLoading(true)
    try {
      const response = await fetch(api.waterfall, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, categoryColumn, valueColumn })
      })

      const result = await response.json()
      if (result.success) {
        setChartData(result.data)
      }
    } catch (error) {
      console.error('Erreur génération waterfall:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getBarColor = (value: number, isTotal: boolean) => {
    if (isTotal) return '#6366f1' // Indigo pour total
    return value >= 0 ? '#10b981' : '#ef4444' // Vert positif, Rouge négatif
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Graphique en Cascade (Waterfall)
          </CardTitle>
          <CardDescription>
            Visualisez les évolutions cumulatives et les contributions de chaque élément
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Catégorie (Axe X)</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={categoryColumn}
                onChange={(e) => setCategoryColumn(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {textColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Valeur (Axe Y)</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={valueColumn}
                onChange={(e) => setValueColumn(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={generateWaterfall}
            disabled={isLoading || !categoryColumn || !valueColumn}
            className="w-full"
            size="lg"
          >
            {isLoading ? '📊 Génération en cours...' : '🚀 Générer le Graphique'}
          </Button>
        </CardContent>
      </Card>

      {/* Graphique */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultat - Cascade</CardTitle>
            <CardDescription>
              Les barres vertes indiquent une augmentation, les rouges une diminution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => new Intl.NumberFormat('fr-FR').format(value)}
                />
                <Legend />
                <Bar dataKey="value" name="Valeur">
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor(entry.value, entry.isTotal)} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Légende */}
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Augmentation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Diminution</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-500 rounded"></div>
                <span>Total</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
