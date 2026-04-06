import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Scissors, Type, ArrowUpCircle } from 'lucide-react'

export interface ColumnConfig {
  originalName: string
  newName: string
  type: 'Text' | 'Number' | 'Date' | 'Boolean'
  included: boolean
}

interface MappingModuleProps {
  filename: string
  columns: string[]
  previewData: Record<string, unknown>[]
  onFileUpdate: (newFileData: any) => void
  onMappingComplete: (mapping: ColumnConfig[]) => void
}

interface ProfileInfo {
  type: string
  missingCount: number
  missingPercent: number
  uniqueCount: number
  min?: number
  max?: number
  avg?: number
}

// ─── Détection automatique du type d'une colonne ──────────────────────────
function detectType(col: string, rows: Record<string, unknown>[]): ColumnConfig['type'] {
  const sample = rows
    .map(r => r[col])
    .filter(v => v !== null && v !== undefined && v !== '')

  if (sample.length === 0) return 'Text'

  const boolValues = new Set(['true','false','vrai','faux','oui','non','yes','no','1','0'])
  const isBool = sample.every(v => boolValues.has(String(v).toLowerCase()))
  if (isBool) return 'Boolean'

  const isDate = sample.every(v => {
    const s = String(v).trim()
    if (/^\d+$/.test(s)) return false
    const d = new Date(s)
    return !isNaN(d.getTime())
  })
  if (isDate) return 'Date'

  const isFrDate = sample.every(v => {
    const s = String(v).trim()
    return /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s)
  })
  if (isFrDate) return 'Date'

  const numericCount = sample.filter(v => {
    const n = Number(String(v).replace(/\s/g, '').replace(',', '.'))
    return !isNaN(n) && String(v).trim() !== ''
  }).length
  if (numericCount / sample.length >= 0.8) return 'Number'

  return 'Text'
}

const TYPE_BADGE: Record<ColumnConfig['type'], string> = {
  Text: '🔤 Texte',
  Number: '🔢 Nombre',
  Date: '📅 Date',
  Boolean: '☑ Booléen',
}

const TYPE_BADGE_COLOR: Record<ColumnConfig['type'], string> = {
  Text: 'bg-slate-100 text-slate-700',
  Number: 'bg-indigo-100 text-indigo-700',
  Date: 'bg-amber-100 text-amber-700',
  Boolean: 'bg-emerald-100 text-emerald-700',
}

export function MappingModule({ filename, columns, previewData, onFileUpdate, onMappingComplete }: MappingModuleProps) {
  const [config, setConfig] = useState<ColumnConfig[]>([])
  const [profile, setProfile] = useState<Record<string, ProfileInfo>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [qualityScore, setQualityScore] = useState(100)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      })
      const result = await res.json()
      if (result.success) {
        setProfile(result.profile)
        // Calculate overall quality score (weighted by completeness)
        const totalRows = result.totalRows
        if (totalRows > 0) {
            const profiles = Object.values(result.profile) as ProfileInfo[]
            const avgMissing = profiles.reduce((acc, p) => acc + p.missingPercent, 0) / (profiles.length || 1)
            setQualityScore(Math.max(0, Math.round(100 - avgMissing)))
        }
      }
    } catch (e) {
      console.error("Profile error:", e)
    }
  }, [filename])

  // Sync config when columns/previewData changes
  useEffect(() => {
    setConfig(prev => {
        const map = new Map(prev.map(c => [c.originalName, c]))
        return columns.map(col => {
            const existing = map.get(col)
            return {
                originalName: col,
                newName: existing?.newName || col,
                type: existing?.type || detectType(col, previewData),
                included: existing ? existing.included : true,
            }
        })
    })
    fetchProfile()
  }, [columns, previewData, fetchProfile])

  const handleUpdate = (idx: number, updates: Partial<ColumnConfig>) => {
    setConfig(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...updates }
      return next
    })
  }

  const handleClean = async (column: string | null, action: string, value?: any) => {
    setIsProcessing(true)
    try {
      const res = await fetch('http://localhost:3001/api/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, column, action, value })
      })
      const result = await res.json()
      if (result.success) {
        onFileUpdate(result)
      }
    } catch (e) {
      console.error("Clean error:", e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleValidate = () => onMappingComplete(config)

  return (
    <div className="space-y-6">
      {/* 🩺 Data Health Dashboard */}
      <Card className="border-indigo-100 bg-indigo-50/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
                <AlertCircle className="w-5 h-5" /> Diagnostic de Santé des Données
              </CardTitle>
              <CardDescription>Analyse de qualité du fichier {filename}</CardDescription>
            </div>
            <div className="text-right">
                <div className={`text-3xl font-black ${qualityScore > 90 ? 'text-emerald-600' : qualityScore > 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {qualityScore}%
                </div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Score de Qualité Global</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-white/50 rounded-lg border border-white">
                  <div className="text-xs text-muted-foreground mb-1">Total Lignes</div>
                  <div className="font-bold">{Object.values(profile)[0]?.uniqueCount ? 'Chargé' : '--'}</div>
              </div>
              <div className="p-3 bg-white/50 rounded-lg border border-white">
                  <div className="text-xs text-muted-foreground mb-1">Colonnes</div>
                  <div className="font-bold">{columns.length}</div>
              </div>
              <div className="p-3 bg-white/50 rounded-lg border border-white">
                  <div className="text-xs text-muted-foreground mb-1">Doublons potentiels</div>
                  <Button variant="link" className="p-0 h-auto text-xs text-indigo-600" onClick={() => handleClean(null, 'deduplicate')}>Nettoyer les doublons</Button>
              </div>
              <div className="p-3 bg-white/50 rounded-lg border border-white">
                  <div className="text-xs text-muted-foreground mb-1">Champs vides</div>
                  <div className="font-bold text-rose-500">
                      {Object.values(profile).reduce((acc, p) => acc + p.missingCount, 0)} cells
                  </div>
              </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration & Nettoyage (Mapping)</CardTitle>
          <CardDescription>
            Ajustez vos colonnes et corrigez les anomalies détectées ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border overflow-x-auto shadow-inner bg-card">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/80 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-[5%] text-center">Inclure</th>
                  <th className="px-4 py-3 w-[20%]">Fichier d'origine</th>
                  <th className="px-4 py-3 w-[15%]">Qualité</th>
                  <th className="px-4 py-3 w-[20%]">Alias (Nouveau nom)</th>
                  <th className="px-4 py-3 w-[20%]">Type</th>
                  <th className="px-4 py-3 w-[20%]">Actions de Nettoyage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {config.map((col, idx) => {
                  const p = profile[col.originalName]
                  return (
                    <tr
                      key={col.originalName}
                      className={`transition-colors ${!col.included ? 'opacity-40 bg-muted/10' : 'hover:bg-muted/5'}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer accent-indigo-600"
                          checked={col.included}
                          onChange={e => handleUpdate(idx, { included: e.target.checked })}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-xs truncate max-w-[150px]" title={col.originalName}>
                            {col.originalName}
                        </div>
                        {p && <div className="text-[10px] text-muted-foreground mt-0.5">{p.uniqueCount} val. uniques</div>}
                      </td>
                      <td className="px-4 py-4">
                        {p ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span>Remplissage</span>
                                <span className={p.missingPercent > 10 ? 'text-rose-500 font-bold' : 'text-emerald-600'}>
                                    {Math.round(100 - p.missingPercent)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1">
                                <div 
                                    className={`h-1 rounded-full ${p.missingPercent > 10 ? 'bg-rose-400' : 'bg-emerald-400'}`} 
                                    style={{ width: `${100 - p.missingPercent}%` }}
                                />
                            </div>
                          </div>
                        ) : '--'}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          className="flex h-8 w-full rounded border bg-background px-2 text-xs shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                          value={col.newName}
                          onChange={e => handleUpdate(idx, { newName: e.target.value })}
                          disabled={!col.included}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select
                          className="flex h-8 w-full rounded border bg-background px-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          value={col.type}
                          onChange={e => handleUpdate(idx, { type: e.target.value as ColumnConfig['type'] })}
                          disabled={!col.included}
                        >
                          <option value="Text">🔤 Texte</option>
                          <option value="Number">🔢 Nombre</option>
                          <option value="Date">📅 Date</option>
                          <option value="Boolean">☑ Booléen</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2 text-[10px] gap-1"
                                onClick={() => handleClean(col.originalName, 'trim')}
                                title="Enlever les espaces"
                                disabled={isProcessing || !col.included}
                            >
                                <Scissors className="w-3 h-3" /> Espace
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2 text-[10px] gap-1"
                                onClick={() => handleClean(col.originalName, 'uppercase')}
                                title="Tout en Majuscules"
                                disabled={isProcessing || !col.included}
                            >
                                <ArrowUpCircle className="w-3 h-3" /> MAJ
                            </Button>
                            {p && p.missingCount > 0 && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 px-2 text-[10px] gap-1 text-rose-600 border-rose-100 hover:bg-rose-50"
                                    onClick={() => handleClean(col.originalName, 'fill_null', 'VALEUR VIDE')}
                                    title="Remplir les vides"
                                    disabled={isProcessing || !col.included}
                                >
                                    <Type className="w-3 h-3" /> Remplir
                                </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 
                Prêt pour l'étape de croisement / jointure
            </div>
            <Button onClick={handleValidate} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700">
              {isProcessing ? '⏳ Traitement manuel...' : 'Valider le Mapping & Continuer'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
