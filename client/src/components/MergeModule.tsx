import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { api } from '@/lib/api'

interface FileInfo {
  filename: string
  originalName?: string
  columns: string[]
  previewData: Record<string, unknown>[]
  totalRows: number
}

interface MergedResult extends FileInfo {
  mergedFrom: string
}

interface KeyAnalysis {
  column: string
  commonCount: number
  file1Unique: number
  file2Unique: number
  matchPercent: number
  sampleMatches: string[]
}

interface MergeProps {
  file1Name: string
  file1ServerName: string
  file1Columns: string[]
  file2Data?: FileInfo | null
  onMergeComplete: (mergedFileData: FileInfo) => void
  onAddAnotherFile: () => void
  onGoToMapping: () => void
}

const CONTEXTS = {
  generic: { label: 'Générique', both: 'Présent dans les deux', f1: 'Absent fichier 2', f2: 'Apparu (Seulement F2)' },
  insurance: { label: 'Assurances & Contrats', both: 'Renouvelé / Maintenu', f1: 'Résilié / Non reconduit', f2: 'Affaire Nouvelle' },
  hr: { label: 'Ressources Humaines', both: 'Maintenu en poste', f1: 'Départ', f2: 'Nouvelle Embauche' },
  custom: { label: 'Personnalisé...', both: '', f1: '', f2: '' },
}

export function MergeModule({
  file1Name,
  file1ServerName,
  file1Columns,
  file2Data,
  onAddAnotherFile,
  onMergeComplete,
  onGoToMapping,
}: MergeProps) {
  const [keys1, setKeys1] = useState<string[]>([])
  const [keys2, setKeys2] = useState<string[]>([])
  
  const [joinType, setJoinType] = useState('LEFT JOIN')
  const [suffix1, setSuffix1] = useState(' (N-1)')
  const [suffix2, setSuffix2] = useState(' (N)')
  const [suffixPreset, setSuffixPreset] = useState<'n' | 'year' | 'f1' | 'custom'>('n')
  
  const [context, setContext] = useState<keyof typeof CONTEXTS>('generic')
  const [customLabels, setCustomLabels] = useState({ both: 'Présent', f1: 'Absent F2', f2: 'Nouveau F2' })

  const [isMerging, setIsMerging] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mergeResult, setMergeResult] = useState<MergedResult | null>(null)
  const [keyAnalysis, setKeyAnalysis] = useState<KeyAnalysis[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (file2Data) {
      setIsAnalyzing(true)
      fetch(api.analyzeKeys, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file1: file1ServerName,
          file2: file2Data.filename
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setKeyAnalysis(data.commonColumns)
          }
        })
        .catch(console.error)
        .finally(() => setIsAnalyzing(false))
    }
  }, [file1ServerName, file2Data])

  const handleSuffixPreset = (preset: typeof suffixPreset) => {
    setSuffixPreset(preset)
    if (preset === 'n') {
      setSuffix1(' (N-1)')
      setSuffix2(' (N)')
    } else if (preset === 'year') {
      setSuffix1(' (2024)')
      setSuffix2(' (2025)')
    } else if (preset === 'f1') {
      setSuffix1(' (F1)')
      setSuffix2(' (F2)')
    }
  }

  const toggleKey = (col: string, isF1: boolean) => {
    if (isF1) {
      setKeys1(prev => prev.includes(col) ? prev.filter(k => k !== col) : [...prev, col])
    } else {
      setKeys2(prev => prev.includes(col) ? prev.filter(k => k !== col) : [...prev, col])
    }
  }

  const handleMerge = async () => {
    if (keys1.length === 0 || keys2.length === 0) {
      setErrorMsg('Veuillez sélectionner au moins une clé de jointure pour chaque fichier.')
      return
    }

    setIsMerging(true)
    setErrorMsg(null)

    const labels = context === 'custom' ? customLabels : CONTEXTS[context]

    try {
      const response = await fetch(api.merge, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file1: file1ServerName,
          file2: file2Data!.filename,
          keys1,
          keys2,
          joinType,
          suffix1,
          suffix2,
          labelBoth: labels.both,
          labelF1: labels.f1,
          labelF2: labels.f2
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de la fusion.')

      const result: FileInfo = await response.json()

      setMergeResult({
        ...result,
        mergedFrom: `${file1Name} ← ${file2Data!.originalName || file2Data!.filename}`,
      })

      onMergeComplete(result)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsMerging(false)
    }
  }

  const handleReset = () => {
    setMergeResult(null)
    setErrorMsg(null)
  }

  if (mergeResult) {
    const previewCols = mergeResult.columns
    const previewRows = mergeResult.previewData

    // Grouper les colonnes par catégorie pour un meilleur affichage
    const keyCols = previewCols.filter(c => !c.includes('(') && !c.includes('Statut') && !c.includes('Évolution'))
    const statusCols = previewCols.filter(c => c.includes('Statut'))
    const f1Cols = previewCols.filter(c => c.includes(suffix1))
    const f2Cols = previewCols.filter(c => c.includes(suffix2))
    const evolutionCols = previewCols.filter(c => c.includes('Évolution'))

    return (
      <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <span>✅</span> Fusion réussie !
          </CardTitle>
          <CardDescription>
            {mergeResult.mergedFrom} — <strong>{mergeResult.totalRows.toLocaleString('fr-FR')}</strong> lignes fusionnées · {mergeResult.columns.length} colonnes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Statistiques de fusion */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200">
              <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Colonnes Fichier 1</div>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{f1Cols.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200">
              <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Colonnes Fichier 2</div>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{f2Cols.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200">
              <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Colonnes Évolution</div>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{evolutionCols.length}</div>
            </div>
          </div>

          {/* Aperçu avec colonnes groupées */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Aperçu des données fusionnées (5 premières lignes)</h3>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">Fichier 1{suffix1}</span>
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">Fichier 2{suffix2}</span>
                <span className="px-2 py-1 rounded bg-purple-100 text-purple-700">Évolutions</span>
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-md border bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase">
                  <tr>
                    {/* Clés */}
                    {keyCols.map((c, idx) => (
                      <th key={idx} className="px-3 py-2 whitespace-nowrap bg-slate-100 dark:bg-slate-800 font-bold">{c}</th>
                    ))}
                    {/* Statut */}
                    {statusCols.map((c, idx) => (
                      <th key={idx} className="px-3 py-2 whitespace-nowrap bg-amber-100 dark:bg-amber-900 font-bold">{c}</th>
                    ))}
                    {/* Fichier 1 */}
                    {f1Cols.map((c, idx) => (
                      <th key={idx} className="px-3 py-2 whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/20">{c}</th>
                    ))}
                    {/* Fichier 2 */}
                    {f2Cols.map((c, idx) => (
                      <th key={idx} className="px-3 py-2 whitespace-nowrap bg-blue-50 dark:bg-blue-900/20">{c}</th>
                    ))}
                    {/* Évolutions */}
                    {evolutionCols.map((c, idx) => (
                      <th key={idx} className="px-3 py-2 whitespace-nowrap bg-purple-50 dark:bg-purple-900/20">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t hover:bg-muted/10">
                      {/* Clés */}
                      {keyCols.map((c, idx) => (
                        <td key={idx} className="px-3 py-2 whitespace-nowrap font-medium bg-slate-50/50 dark:bg-slate-800/50">
                          {String(row[c] ?? '')}
                        </td>
                      ))}
                      {/* Statut */}
                      {statusCols.map((c, idx) => {
                        const val = String(row[c] ?? '')
                        const bgColor = val.toLowerCase().includes('nouveau') || val.toLowerCase().includes('affaire') 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : val.toLowerCase().includes('absent') || val.toLowerCase().includes('résili') || val.toLowerCase().includes('départ')
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        return (
                          <td key={idx} className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${bgColor}`}>
                              {val}
                            </span>
                          </td>
                        )
                      })}
                      {/* Fichier 1 */}
                      {f1Cols.map((c, idx) => (
                        <td key={idx} className="px-3 py-2 whitespace-nowrap truncate max-w-[150px] bg-emerald-50/30 dark:bg-emerald-900/10">
                          {String(row[c] ?? '')}
                        </td>
                      ))}
                      {/* Fichier 2 */}
                      {f2Cols.map((c, idx) => (
                        <td key={idx} className="px-3 py-2 whitespace-nowrap truncate max-w-[150px] bg-blue-50/30 dark:bg-blue-900/10">
                          {String(row[c] ?? '')}
                        </td>
                      ))}
                      {/* Évolutions */}
                      {evolutionCols.map((c, idx) => {
                        const val = row[c]
                        const numVal = typeof val === 'number' ? val : parseFloat(String(val))
                        const isPercent = c.includes('%')
                        const displayVal = !isNaN(numVal) 
                          ? (isPercent ? `${numVal > 0 ? '+' : ''}${numVal.toFixed(2)}%` : `${numVal > 0 ? '+' : ''}${numVal.toLocaleString('fr-FR')}`)
                          : String(val ?? '')
                        const textColor = !isNaN(numVal) && numVal > 0 
                          ? 'text-green-700 dark:text-green-400 font-semibold' 
                          : !isNaN(numVal) && numVal < 0 
                          ? 'text-red-700 dark:text-red-400 font-semibold'
                          : 'text-gray-600'
                        return (
                          <td key={idx} className={`px-3 py-2 whitespace-nowrap bg-purple-50/30 dark:bg-purple-900/10 ${textColor}`}>
                            {displayVal}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info sur les colonnes */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-100 dark:border-blue-900">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-semibold">💡 Astuce :</span> Le fichier Excel contient toutes les colonnes des deux fichiers côte à côte pour faciliter la comparaison. 
              Les colonnes d'évolution montrent automatiquement les différences (valeur absolue et pourcentage) pour les données numériques.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} size="sm">
                🔄 Refaire un Merge
              </Button>
              <a
                href={api.download(mergeResult.filename)}
                download={mergeResult.filename}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2"
              >
                ⬇ Télécharger le fichier fusionné
              </a>
            </div>
            <Button onClick={onGoToMapping} size="lg">
              Continuer → Mapping & TCD
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Power Query — Fusion Flex (Merge Multi-Clés)</CardTitle>
        <CardDescription>
          Combinez vos fichiers selon vos règles. Mettez en évidence les évolutions et écarts automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {!file2Data ? (
          <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg bg-muted/10 space-y-4">
            <p className="text-muted-foreground text-center">
              Requis : Importez votre second fichier pour croiser les données.
            </p>
            <Button onClick={onAddAnotherFile} variant="outline">
              📂 Sélectionner le Fichier 2
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Analyse automatique des clés */}
            {isAnalyzing ? (
              <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-2">
                <div className="animate-spin">⏳</div>
                <span className="text-sm">Analyse des colonnes communes...</span>
              </div>
            ) : keyAnalysis.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Sparkles className="w-4 h-4" />
                  <span>💡 Clés de jointure recommandées</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {keyAnalysis.map(analysis => (
                    <div 
                      key={analysis.column}
                      onClick={() => {
                        setKeys1([analysis.column])
                        setKeys2([analysis.column])
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        analysis.matchPercent > 0 
                          ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400' 
                          : 'border-muted bg-muted/30 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{analysis.column}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          analysis.matchPercent >= 50 ? 'bg-emerald-100 text-emerald-700' :
                          analysis.matchPercent > 0 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {analysis.matchPercent}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>Correspondances: {analysis.commonCount.toLocaleString()}</div>
                        <div>Uniques F1: {analysis.file1Unique.toLocaleString()} | F2: {analysis.file2Unique.toLocaleString()}</div>
                      </div>
                      {analysis.matchPercent > 0 && analysis.sampleMatches.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/50">
                          <span className="text-[10px] text-muted-foreground">Exemples:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {analysis.sampleMatches.slice(0, 3).map((sample, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white rounded border">
                                {String(sample).substring(0, 15)}...
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clés Multiples */}
            <div>
              <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">1. Clés de Jointure (Identifiant unique)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Sélectionnez une ou plusieurs colonnes pour identifier de manière unique une ligne (ex: Police + Client).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-muted/5">
                <div>
                  <p className="text-sm font-semibold mb-2">📄 Fichier 1 : {file1Name}</p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                    {file1Columns.map(c => (
                      <span 
                        key={c} 
                        onClick={() => toggleKey(c, true)}
                        className={`text-xs px-2 py-1 rounded cursor-pointer border select-none transition-colors ${keys1.includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  {keys1.length > 0 && <p className="text-xs mt-2 text-primary">Clé F1 : {keys1.join(' + ')}</p>}
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">📄 Fichier 2 : {file2Data.originalName || file2Data.filename}</p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                    {file2Data.columns.map(c => (
                      <span 
                        key={c} 
                        onClick={() => toggleKey(c, false)}
                        className={`text-xs px-2 py-1 rounded cursor-pointer border select-none transition-colors ${keys2.includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  {keys2.length > 0 && <p className="text-xs mt-2 text-primary">Clé F2 : {keys2.join(' + ')}</p>}
                </div>
              </div>
            </div>

            {/* Suffixes Optionnels */}
            <div>
              <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">2. Suffixes (Pour les colonnes en double)</h3>
              
              {/* Presets */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handleSuffixPreset('n')}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    suffixPreset === 'n' 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  N-1 / N
                </button>
                <button
                  type="button"
                  onClick={() => handleSuffixPreset('year')}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    suffixPreset === 'year' 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  2024 / 2025
                </button>
                <button
                  type="button"
                  onClick={() => handleSuffixPreset('f1')}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    suffixPreset === 'f1' 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  F1 / F2
                </button>
                <button
                  type="button"
                  onClick={() => { setSuffixPreset('custom'); setSuffix1(''); setSuffix2(''); }}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    suffixPreset === 'custom' 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Personnalisé
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Fichier 1 (N-1)</label>
                  <input 
                    type="text" 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" 
                    value={suffix1} 
                    onChange={e => { setSuffix1(e.target.value); setSuffixPreset('custom'); }} 
                    placeholder="Ex: (N-1)"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Fichier 2 (N)</label>
                  <input 
                    type="text" 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" 
                    value={suffix2} 
                    onChange={e => { setSuffix2(e.target.value); setSuffixPreset('custom'); }} 
                    placeholder="Ex: (N)"
                  />
                </div>
              </div>
              
              {/* Info sur l'évolution automatique */}
              <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-md border border-indigo-100 dark:border-indigo-900">
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  <span className="font-semibold">ℹ️ Calcul automatique :</span> Pour les colonnes numériques communes (CA, Montant, Prime...), 
                  une colonne <span className="font-mono">Évolution {suffix2.replace('(', '').replace(')', '')} (+/-)</span> sera automatiquement créée pour afficher la différence (N - N-1).
                </p>
              </div>
            </div>

            {/* Cadrage Métier avec explications détaillées */}
            <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/20">
              <h3 className="text-sm font-bold mb-3 text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <span>3. Terminologie de Résultat (Colonne "Statut de présence")</span>
              </h3>
              
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
                Personnalisez les libellés qui apparaîtront dans la colonne "Statut de présence" selon votre contexte métier.
              </p>

              {/* Sélecteur de contexte */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-blue-800 dark:text-blue-300 block mb-2">Contexte prédéfini :</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={context}
                  onChange={e => setContext(e.target.value as keyof typeof CONTEXTS)}
                >
                  {Object.entries(CONTEXTS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Champs personnalisables avec explications */}
              <div className="space-y-4">
                {/* Présent dans les deux */}
                <div className="p-3 rounded-lg border border-blue-200 bg-white dark:bg-slate-900">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                      ✓
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Présent dans les DEUX fichiers
                      </label>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Signification : La ligne existe dans le Fichier 1 ET dans le Fichier 2 (même clé de jointure)
                      </p>
                      <input 
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={context === 'custom' ? customLabels.both : CONTEXTS[context].both}
                        onChange={e => {
                          if (context !== 'custom') setContext('custom')
                          setCustomLabels({...customLabels, both: e.target.value})
                        }}
                        placeholder="Ex: Présent dans les deux, Renouvelé, Maintenu..."
                      />
                    </div>
                  </div>
                  <div className="ml-11 text-[10px] text-blue-600 dark:text-blue-400">
                    💡 Exemples : "Présent dans les deux", "Renouvelé", "Maintenu en poste", "Client fidèle"
                  </div>
                </div>

                {/* Absent Fichier 2 */}
                <div className="p-3 rounded-lg border border-red-200 bg-white dark:bg-slate-900">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-700 dark:text-red-300 font-bold text-sm">
                      ✗
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Présent dans Fichier 1 UNIQUEMENT (Absent du Fichier 2)
                      </label>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Signification : La ligne existe dans le Fichier 1 mais PAS dans le Fichier 2 (disparue, supprimée, résiliée...)
                      </p>
                      <input 
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={context === 'custom' ? customLabels.f1 : CONTEXTS[context].f1}
                        onChange={e => {
                          if (context !== 'custom') setContext('custom')
                          setCustomLabels({...customLabels, f1: e.target.value})
                        }}
                        placeholder="Ex: Absent fichier 2, Résilié, Départ, Perdu..."
                      />
                    </div>
                  </div>
                  <div className="ml-11 text-[10px] text-red-600 dark:text-red-400">
                    💡 Exemples : "Absent fichier 2", "Résilié", "Départ", "Client perdu", "Contrat terminé"
                  </div>
                </div>

                {/* Nouveau Fichier 2 */}
                <div className="p-3 rounded-lg border border-green-200 bg-white dark:bg-slate-900">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm">
                      +
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Présent dans Fichier 2 UNIQUEMENT (Nouveau)
                      </label>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Signification : La ligne existe dans le Fichier 2 mais PAS dans le Fichier 1 (nouvelle entrée, ajout, acquisition...)
                      </p>
                      <input 
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={context === 'custom' ? customLabels.f2 : CONTEXTS[context].f2}
                        onChange={e => {
                          if (context !== 'custom') setContext('custom')
                          setCustomLabels({...customLabels, f2: e.target.value})
                        }}
                        placeholder="Ex: Nouveau, Affaire nouvelle, Embauche, Acquisition..."
                      />
                    </div>
                  </div>
                  <div className="ml-11 text-[10px] text-green-600 dark:text-green-400">
                    💡 Exemples : "Nouveau (Seulement F2)", "Affaire nouvelle", "Nouvelle embauche", "Client acquis"
                  </div>
                </div>
              </div>

              {/* Aperçu du résultat */}
              <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-md border border-indigo-200 dark:border-indigo-800">
                <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-2">📊 Aperçu de la colonne "Statut de présence" :</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {context === 'custom' ? customLabels.both : CONTEXTS[context].both}
                    </span>
                    <span className="text-[10px] text-muted-foreground">← Lignes présentes dans les 2 fichiers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      {context === 'custom' ? customLabels.f1 : CONTEXTS[context].f1}
                    </span>
                    <span className="text-[10px] text-muted-foreground">← Lignes uniquement dans Fichier 1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {context === 'custom' ? customLabels.f2 : CONTEXTS[context].f2}
                    </span>
                    <span className="text-[10px] text-muted-foreground">← Lignes uniquement dans Fichier 2</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Type de Jointure */}
            <div>
              <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">4. Méthode de Fusion</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { value: 'LEFT JOIN', label: '⬅ LEFT JOIN', desc: 'Fichier 1 enrichi' },
                  { value: 'RIGHT JOIN', label: '➡ RIGHT JOIN', desc: 'Fichier 2 enrichi' },
                  { value: 'INNER JOIN', label: '⚡ INNER JOIN', desc: 'Lignes Communes' },
                  { value: 'FULL JOIN', label: '🌍 FULL OUTER', desc: 'Tout conserver' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setJoinType(opt.value)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      joinType === opt.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/40'
                    }`}
                  >
                    <p className="font-semibold text-xs text-center">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground text-center mt-1">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/30">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" size="sm" onClick={onAddAnotherFile}>
                🔄 Changer le Fichier 2
              </Button>
              <Button onClick={handleMerge} disabled={isMerging} size="lg">
                {isMerging ? '⏳ Analyse en cours…' : '🚀 Lancer l\'Analyse Croisée'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

