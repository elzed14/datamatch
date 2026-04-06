import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, CheckCircle2 } from 'lucide-react'

interface DataCleanerProps {
  filename: string
  columns: string[]
  onCleanComplete: (newFilename: string) => void
}

interface CleaningRule {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  column?: string
}

export function DataCleaner({ filename, columns, onCleanComplete }: DataCleanerProps) {
  const [rules, setRules] = useState<CleaningRule[]>([
    {
      id: 'trim',
      name: 'Supprimer les espaces',
      description: 'Retire les espaces en début et fin de texte',
      icon: '✂️',
      enabled: true
    },
    {
      id: 'uppercase',
      name: 'MAJUSCULES',
      description: 'Convertit tout en majuscules',
      icon: '🔠',
      enabled: false
    },
    {
      id: 'lowercase',
      name: 'minuscules',
      description: 'Convertit tout en minuscules',
      icon: '🔡',
      enabled: false
    },
    {
      id: 'remove_accents',
      name: 'Retirer les accents',
      description: 'Normalise les caractères accentués',
      icon: '📝',
      enabled: false
    },
    {
      id: 'remove_duplicates',
      name: 'Supprimer les doublons',
      description: 'Garde uniquement les lignes uniques',
      icon: '🔄',
      enabled: false
    },
    {
      id: 'fill_empty',
      name: 'Remplir les vides',
      description: 'Remplace les cellules vides par une valeur',
      icon: '📋',
      enabled: false
    },
    {
      id: 'remove_empty_rows',
      name: 'Supprimer lignes vides',
      description: 'Retire les lignes sans données',
      icon: '🗑️',
      enabled: false
    },
    {
      id: 'normalize_numbers',
      name: 'Normaliser les nombres',
      description: 'Convertit les nombres au format standard',
      icon: '🔢',
      enabled: false
    },
    {
      id: 'remove_special_chars',
      name: 'Retirer caractères spéciaux',
      description: 'Supprime les caractères non alphanumériques',
      icon: '🚫',
      enabled: false
    }
  ])

  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [fillValue, setFillValue] = useState('')
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanResult, setCleanResult] = useState<any>(null)

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const cleanData = async () => {
    const enabledRules = rules.filter(r => r.enabled).map(r => r.id)
    if (enabledRules.length === 0) return

    setIsCleaning(true)
    try {
      const response = await fetch('http://localhost:3001/api/clean-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          rules: enabledRules,
          columns: selectedColumns.length > 0 ? selectedColumns : columns,
          fillValue
        })
      })

      const result = await response.json()
      if (result.success) {
        setCleanResult(result)
        onCleanComplete(result.filename)
      }
    } catch (error) {
      console.error('Erreur nettoyage:', error)
    } finally {
      setIsCleaning(false)
    }
  }

  const enabledCount = rules.filter(r => r.enabled).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Nettoyage Automatisé de Données
          </CardTitle>
          <CardDescription>
            Appliquez des règles de nettoyage pour améliorer la qualité de vos données
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Règles de nettoyage */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Règles de nettoyage ({enabledCount} activée{enabledCount > 1 ? 's' : ''})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  onClick={() => toggleRule(rule.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    rule.enabled
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                      : 'border-muted hover:border-muted-foreground/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{rule.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{rule.name}</h4>
                        {rule.enabled && (
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sélection des colonnes */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Colonnes à nettoyer (optionnel)</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Si aucune colonne n'est sélectionnée, toutes seront nettoyées
            </p>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 max-h-40 overflow-y-auto">
              {columns.map(col => (
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
          </div>

          {/* Valeur de remplissage */}
          {rules.find(r => r.id === 'fill_empty')?.enabled && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Valeur de remplissage pour les cellules vides
              </label>
              <input
                type="text"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ex: N/A, 0, Inconnu..."
                value={fillValue}
                onChange={(e) => setFillValue(e.target.value)}
              />
            </div>
          )}

          {/* Bouton de nettoyage */}
          <Button
            onClick={cleanData}
            disabled={isCleaning || enabledCount === 0}
            className="w-full"
            size="lg"
          >
            {isCleaning ? '🧹 Nettoyage en cours...' : `✨ Nettoyer les Données (${enabledCount} règle${enabledCount > 1 ? 's' : ''})`}
          </Button>
        </CardContent>
      </Card>

      {/* Résultat */}
      {cleanResult && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Nettoyage Terminé !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-white border">
                <div className="text-xs text-muted-foreground">Lignes avant</div>
                <div className="text-2xl font-bold">{cleanResult.rowsBefore}</div>
              </div>
              <div className="p-3 rounded-lg bg-white border">
                <div className="text-xs text-muted-foreground">Lignes après</div>
                <div className="text-2xl font-bold text-green-600">{cleanResult.rowsAfter}</div>
              </div>
              <div className="p-3 rounded-lg bg-white border">
                <div className="text-xs text-muted-foreground">Lignes supprimées</div>
                <div className="text-2xl font-bold text-red-600">
                  {cleanResult.rowsBefore - cleanResult.rowsAfter}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white border">
                <div className="text-xs text-muted-foreground">Modifications</div>
                <div className="text-2xl font-bold text-blue-600">{cleanResult.modifications || 0}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCleanResult(null)}>
                🔄 Nettoyer à nouveau
              </Button>
              <a
                href={`http://localhost:3001/api/download/${cleanResult.filename}`}
                download={cleanResult.filename}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                ⬇ Télécharger le fichier nettoyé
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
