import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Plus, X, Save, Layout, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react'

interface Widget {
  id: string
  type: 'bar' | 'line' | 'pie' | 'stat'
  title: string
  dataKey: string
  categoryKey?: string
  position: { x: number; y: number }
  size: { w: number; h: number }
}

interface CustomDashboardProps {
  filename: string
  columns: string[]
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444']

export function CustomDashboard({ filename, columns }: CustomDashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [widgetData, setWidgetData] = useState<Record<string, any[]>>({})
  const [isAddingWidget, setIsAddingWidget] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Partial<Widget> | null>(null)
  const [savedLayouts, setSavedLayouts] = useState<string[]>([])

  const numericColumns = columns.filter(col => 
    col.toLowerCase().includes('ca') ||
    col.toLowerCase().includes('montant') ||
    col.toLowerCase().includes('prime') ||
    col.toLowerCase().includes('evolution') ||
    col.toLowerCase().includes('quantite')
  )

  const categoryColumns = columns.filter(col => 
    col.toLowerCase().includes('nom') ||
    col.toLowerCase().includes('client') ||
    col.toLowerCase().includes('statut') ||
    col.toLowerCase().includes('type') ||
    col.toLowerCase().includes('categorie')
  )

  const addWidget = async () => {
    if (!editingWidget?.type || !editingWidget?.dataKey) return

    const newWidget: Widget = {
      id: Date.now().toString(),
      type: editingWidget.type,
      title: editingWidget.title || `${editingWidget.type} - ${editingWidget.dataKey}`,
      dataKey: editingWidget.dataKey,
      categoryKey: editingWidget.categoryKey,
      position: { x: widgets.length % 2, y: Math.floor(widgets.length / 2) },
      size: { w: 1, h: 1 }
    }

    // Charger les données pour ce widget
    try {
      const response = await fetch('http://localhost:3001/api/widget-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          dataKey: newWidget.dataKey,
          categoryKey: newWidget.categoryKey,
          type: newWidget.type
        })
      })

      const result = await response.json()
      if (result.success) {
        setWidgetData(prev => ({ ...prev, [newWidget.id]: result.data }))
        setWidgets(prev => [...prev, newWidget])
        setIsAddingWidget(false)
        setEditingWidget(null)
      }
    } catch (error) {
      console.error('Erreur chargement widget:', error)
    }
  }

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id))
    setWidgetData(prev => {
      const newData = { ...prev }
      delete newData[id]
      return newData
    })
  }

  const saveLayout = () => {
    const layoutName = `Layout ${savedLayouts.length + 1}`
    const layout = JSON.stringify(widgets)
    localStorage.setItem(`dashboard_layout_${layoutName}`, layout)
    setSavedLayouts(prev => [...prev, layoutName])
  }

  const loadLayout = (layoutName: string) => {
    const layout = localStorage.getItem(`dashboard_layout_${layoutName}`)
    if (layout) {
      const loadedWidgets = JSON.parse(layout)
      setWidgets(loadedWidgets)
      // Recharger les données pour chaque widget
      loadedWidgets.forEach((widget: Widget) => {
        fetch('http://localhost:3001/api/widget-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            dataKey: widget.dataKey,
            categoryKey: widget.categoryKey,
            type: widget.type
          })
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              setWidgetData(prev => ({ ...prev, [widget.id]: result.data }))
            }
          })
      })
    }
  }

  const renderWidget = (widget: Widget) => {
    const data = widgetData[widget.id] || []

    if (widget.type === 'stat') {
      const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-4xl font-bold text-primary">{total.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-muted-foreground mt-2">{widget.title}</div>
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <>
        {widget.type === 'bar' && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip formatter={(value: any) => new Intl.NumberFormat('fr-FR').format(value)} />
            <Bar dataKey="value" fill="#6366f1" />
          </BarChart>
        )}
        {widget.type === 'line' && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip formatter={(value: any) => new Intl.NumberFormat('fr-FR').format(value)} />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        )}
        {widget.type === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => new Intl.NumberFormat('fr-FR').format(value)} />
          </PieChart>
        )}
        </>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Dashboard Personnalisable
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsAddingWidget(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter Widget
              </Button>
              <Button onClick={saveLayout} variant="outline" size="sm">
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {savedLayouts.length > 0 && (
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Layouts sauvegardés :</span>
              {savedLayouts.map(layout => (
                <Button
                  key={layout}
                  onClick={() => loadLayout(layout)}
                  variant="outline"
                  size="sm"
                >
                  {layout}
                </Button>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Modal d'ajout de widget */}
      {isAddingWidget && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Nouveau Widget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Type de widget</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { type: 'bar', icon: BarChart3, label: 'Barres' },
                  { type: 'line', icon: LineChartIcon, label: 'Ligne' },
                  { type: 'pie', icon: PieChartIcon, label: 'Camembert' },
                  { type: 'stat', icon: Layout, label: 'Statistique' }
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setEditingWidget(prev => ({ ...prev, type: type as any }))}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      editingWidget?.type === type
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-muted-foreground/40'
                    }`}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-xs">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Titre</label>
              <input
                type="text"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ex: CA par Client"
                value={editingWidget?.title || ''}
                onChange={(e) => setEditingWidget(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Valeur (Axe Y)</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editingWidget?.dataKey || ''}
                onChange={(e) => setEditingWidget(prev => ({ ...prev, dataKey: e.target.value }))}
              >
                <option value="">Sélectionner...</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {editingWidget?.type !== 'stat' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Catégorie (Axe X)</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingWidget?.categoryKey || ''}
                  onChange={(e) => setEditingWidget(prev => ({ ...prev, categoryKey: e.target.value }))}
                >
                  <option value="">Sélectionner...</option>
                  {categoryColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={addWidget} className="flex-1">
                Ajouter
              </Button>
              <Button onClick={() => { setIsAddingWidget(false); setEditingWidget(null); }} variant="outline">
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grille de widgets */}
      {widgets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Layout className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Aucun widget</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Commencez par ajouter des widgets pour créer votre dashboard personnalisé
            </p>
            <Button onClick={() => setIsAddingWidget(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {widgets.map(widget => (
            <Card key={widget.id} className="relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {widget.title}
                  <Button
                    onClick={() => removeWidget(widget.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {renderWidget(widget)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
