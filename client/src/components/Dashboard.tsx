import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/ExportButton'
import { GeoMap } from '@/components/GeoMap'
import { Search, Sparkles, MapPin, BarChart3, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react'

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa', '#34d399', '#fb923c']

interface DashboardProps {
  columns: string[]
  filename: string
  originalName: string
}

type ChartType = 'bar' | 'pie' | 'line'

function isLikelyNumeric(col: string): boolean {
  const lcol = col.toLowerCase()
  return ['montant', 'prime', 'ca', 'amount', 'total', 'somme', 'prix', 'valeur', 'chiffre', 'revenue', 'cost', 'budget'].some(k => lcol.includes(k))
}

function isLikelyCategory(col: string): boolean {
  const lcol = col.toLowerCase()
  return ['produit', 'product', 'categorie', 'category', 'type', 'statut', 'status', 'intermédiaire', 'intermediaire', 'broker', 'region', 'zone', 'agence', 'branch', 'ville', 'city', 'pays', 'country'].some(k => lcol.includes(k))
}

export function Dashboard({ columns, filename }: Omit<DashboardProps, 'originalName'>) {
  const smartCategory = columns.find(isLikelyCategory) || columns[0] || ''
  const smartNumeric = columns.find(isLikelyNumeric) || columns.find(c => !isLikelyCategory(c)) || columns[1] || ''

  const [groupBy, setGroupBy] = useState(smartCategory)
  const [valueCol, setValueCol] = useState(smartNumeric)
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [query, setQuery] = useState('')
  const [data, setData] = useState<{ name: string; fullName: string; value: number; count: number }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [rawPivotData, setRawPivotData] = useState<any[]>([])

  const isGeoColumn = useMemo(() => {
      const g = groupBy.toLowerCase()
      return ['ville', 'city', 'pays', 'country', 'region', 'zone', 'agence', 'branch', 'location'].some(k => g.includes(k))
  }, [groupBy])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/pivot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          rowFields: [groupBy],
          colFields: [],
          valFields: [{ field: valueCol, agg: 'SUM' }]
        })
      })
      const result = await res.json()
      const raw: Record<string, unknown>[] = result.data || []
      setRawPivotData(raw)

      const mapped = raw.map(row => ({
        name: typeof row._rowKey === 'string' && row._rowKey.length > 20
          ? row._rowKey.substring(0, 20) + '…'
          : String(row._rowKey ?? ''),
        fullName: String(row._rowKey ?? ''),
        value: Number(row[`Grand Total - ${valueCol} (SUM)`] ?? row._count ?? 0),
        count: Number(row._count ?? 0),
      })).sort((a, b) => b.value - a.value).slice(0, 20)

      setData(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  // Phase 4: Assistant IA (Simple heuristic engine)
  const handleSmartAnalyze = () => {
    if (!query) return
    const q = query.toLowerCase()
    
    // Find category
    const catMatch = columns.find(c => q.includes(c.toLowerCase()))
    if (catMatch) setGroupBy(catMatch)
    else if (q.includes('ville') || q.includes('cite')) {
        const cityCol = columns.find(c => c.toLowerCase().includes('ville') || c.toLowerCase().includes('city'))
        if (cityCol) setGroupBy(cityCol)
    }

    // Find value
    const valMatch = columns.find(c => q.includes(c.toLowerCase()) && c !== catMatch)
    if (valMatch) setValueCol(valMatch)

    // Find Type
    if (q.includes('camembert') || q.includes('pie') || q.includes('repartition')) setChartType('pie')
    else if (q.includes('courbe') || q.includes('line') || q.includes('evolution')) setChartType('line')
    else if (q.includes('barre') || q.includes('histogramme')) setChartType('bar')

    setQuery('')
    // Trigger update (fetchData is called after state update via useEffect or immediate call)
    setTimeout(fetchData, 100)
  }

  const kpis = useMemo(() => {
    if (!data.length) return null
    const values = data.map(d => d.value)
    const total = values.reduce((a, b) => a + b, 0)
    const avg = total / (values.length || 1)
    const max = Math.max(...values)
    const maxLabel = data.find(d => d.value === max)?.fullName || ''
    return { total, avg, max, maxLabel, count: data.length }
  }, [data])

  const fmtNum = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)

  // Auto-fetch on first mount if smart defaults found
  useEffect(() => {
    if (smartCategory && smartNumeric) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      {/* 🧠 Smart Analysis Assistant */}
      <Card className="border-emerald-100 bg-emerald-50/10 shadow-sm overflow-hidden">
          <div className="bg-emerald-600 px-4 py-2 flex items-center justify-between text-white">
             <div className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest"><Sparkles className="w-3 h-3" /> Assistant Analytique Intelligent</div>
             <div className="text-[10px] opacity-70 italic">Ex: "Analyse les montants par ville en camembert"</div>
          </div>
          <CardContent className="p-4 flex gap-2">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Posez votre question sur vos données ici (ex: Répartition par produit en barres)..."
                    className="w-full pl-10 pr-4 py-2 border rounded-full text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSmartAnalyze()}
                  />
              </div>
              <Button onClick={handleSmartAnalyze} className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-6 gap-2">
                  <Sparkles className="w-4 h-4" /> Analyser
              </Button>
          </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Manual Config & Map */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase text-muted-foreground">
                ⚙️ Paramètres Manuels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Axe (Groupe)</label>
                  <select
                    className="w-full h-8 px-2 py-1 border rounded text-xs bg-muted/20 outline-none"
                    value={groupBy} onChange={e => setGroupBy(e.target.value)}
                  >
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Valeur (Somme)</label>
                  <select
                    className="w-full h-8 px-2 py-1 border rounded text-xs bg-muted/20 outline-none"
                    value={valueCol} onChange={e => setValueCol(e.target.value)}
                  >
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Style</label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button size="sm" variant={chartType === 'bar' ? 'default' : 'outline'} className="h-8 px-0" onClick={() => setChartType('bar')}><BarChart3 className="w-3 h-3" /></Button>
                    <Button size="sm" variant={chartType === 'pie' ? 'default' : 'outline'} className="h-8 px-0" onClick={() => setChartType('pie')}><PieIcon className="w-3 h-3" /></Button>
                    <Button size="sm" variant={chartType === 'line' ? 'default' : 'outline'} className="h-8 px-0" onClick={() => setChartType('line')}><LineIcon className="w-3 h-3" /></Button>
                  </div>
               </div>
               <Button onClick={fetchData} disabled={isLoading} className="w-full h-9 mt-2 gap-2 text-xs">
                  {isLoading ? '⏳...' : 'Actualiser'}
               </Button>
            </CardContent>
          </Card>

          {/* 🗺️ Geolocation Map Module */}
          {isGeoColumn && data.length > 0 && (
              <GeoMap data={rawPivotData} cityCol={groupBy} valueCol={valueCol} />
          )}

          {/* KPI List column */}
          {kpis && (
              <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: 'Indicateur Total', value: fmtNum(kpis.total), sub: valueCol, color: 'bg-indigo-600', icon: <BarChart3 className="w-4 h-4" /> },
                    { label: 'Top Résultat', value: kpis.maxLabel, sub: fmtNum(kpis.max), color: 'bg-emerald-600', icon: <MapPin className="w-4 h-4" /> }
                  ].map((k, i) => (
                    <Card key={i} className="border-none bg-slate-900 text-white overflow-hidden shadow-md">
                        <div className="p-4 relative">
                            <div className={`absolute top-0 right-0 p-4 opacity-20 text-6xl`}>{k.icon}</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{k.label}</div>
                            <div className="text-xl font-black truncate">{k.value}</div>
                            <div className="text-[10px] opacity-70 mt-1">{k.sub}</div>
                        </div>
                        <div className={`h-1 w-full ${k.color}`}></div>
                    </Card>
                  ))}
              </div>
          )}
        </div>

        {/* Right column: Charts results */}
        <div className="lg:col-span-8 space-y-6">
          {data.length > 0 ? (
            <>
              <Card className="shadow-lg border-indigo-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-lg">{valueCol} par {groupBy}</CardTitle>
                    <CardDescription>Visualisation dynamique du top 20 résultats</CardDescription>
                  </div>
                   <ExportButton
                    sheets={[{
                      name: 'Export Dashboard',
                      data: data.map(d => ({ [groupBy]: d.fullName, [valueCol]: d.value, 'Occurrences': d.count }))
                    }]}
                    filename={`Dashboard_${groupBy}`}
                  />
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    {chartType === 'bar' ? (
                      <BarChart data={data} margin={{ top: 10, right: 30, left: 30, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} height={80} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => fmtNum(v)} />
                        <Tooltip 
                            cursor={{ fill: '#f1f5f9' }} 
                            formatter={(v: any) => [fmtNum(Number(v)), valueCol]} 
                            labelFormatter={(label) => String(label)} 
                        />
                        <Bar dataKey="value" name={valueCol} radius={[4, 4, 0, 0]}>
                          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    ) : chartType === 'pie' ? (
                      <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={60} label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                        <Legend />
                      </PieChart>
                    ) : (
                      <LineChart data={data} margin={{ top: 10, right: 30, left: 30, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} height={80} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => fmtNum(v)} />
                        <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                        <Line type="stepAfter" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Volume Chart */}
              <Card>
                <CardHeader className="py-3">
                   <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                       📊 Volume des données (Nombre d'entrées) par {groupBy}
                   </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 5, right: 30, left: 30, bottom: 50 }}>
                      <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fontSize: 9 }} interval={0} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20 p-20 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">En attente d'analyse...</p>
                <p className="text-xs text-muted-foreground mt-1">Utilisez l'assistant ci-dessus ou configurez manuellement.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
