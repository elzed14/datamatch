import { useState } from 'react'
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/ExportButton'
import { api } from '@/lib/api'

type Zone = 'available' | 'rows' | 'cols' | 'vals'

interface PivotBuilderProps {
  columns: string[]
  filename: string
}

const DraggableField = ({ id, label }: { id: string; label: string }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className="p-2 mb-2 bg-secondary text-secondary-foreground rounded shadow-sm text-sm cursor-grab active:cursor-grabbing border"
    >
      {label}
    </div>
  )
}

const DroppableZone = ({ id, title, items }: { id: Zone; title: string; items: string[] }) => {
  const { isOver, setNodeRef } = useDroppable({ id })
  
  return (
    <Card className={`border-2 ${isOver ? 'border-primary' : 'border-dashed border-muted-foreground/30'} h-full min-h-[150px]`}>
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm text-muted-foreground uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3" ref={setNodeRef}>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Glissez ici</p>
        ) : (
          items.map(item => <DraggableField key={item} id={item} label={item} />)
        )}
      </CardContent>
    </Card>
  )
}

// Modèles de TCD prédéfinis
const PIVOT_TEMPLATES = [
  {
    id: 'sales-by-client',
    name: '📊 Ventes par Client',
    description: 'Analyse du CA par client',
    keywords: ['client', 'nom', 'ca', 'chiffre', 'affaire', 'montant', 'prime'],
    config: { rows: ['client', 'nom'], vals: ['ca', 'montant', 'prime'] }
  },
  {
    id: 'sales-by-period',
    name: '📅 Ventes par Période',
    description: 'Évolution temporelle des ventes',
    keywords: ['date', 'mois', 'année', 'annee', 'periode', 'ca', 'montant'],
    config: { rows: ['date', 'mois', 'année'], vals: ['ca', 'montant'] }
  },
  {
    id: 'product-analysis',
    name: '🏷️ Analyse Produits',
    description: 'Performance par produit/catégorie',
    keywords: ['produit', 'categorie', 'catégorie', 'type', 'ca', 'quantite', 'quantité'],
    config: { rows: ['produit', 'categorie', 'type'], vals: ['ca', 'quantite'] }
  },
  {
    id: 'regional-analysis',
    name: '🗺️ Analyse Géographique',
    description: 'Répartition par région/ville',
    keywords: ['region', 'région', 'ville', 'pays', 'departement', 'département', 'ca', 'montant'],
    config: { rows: ['region', 'ville', 'pays'], vals: ['ca', 'montant'] }
  },
  {
    id: 'status-comparison',
    name: '🔄 Comparaison Statuts',
    description: 'Analyse par statut de présence',
    keywords: ['statut', 'présence', 'presence', 'ca', 'montant', 'evolution', 'évolution'],
    config: { rows: ['statut'], vals: ['ca', 'montant', 'evolution'] }
  },
  {
    id: 'insurance-analysis',
    name: '🛡️ Analyse Assurances',
    description: 'Suivi des polices et primes',
    keywords: ['police', 'contrat', 'prime', 'assure', 'assuré', 'courtier'],
    config: { rows: ['police', 'assure', 'courtier'], vals: ['prime', 'montant'] }
  },
  {
    id: 'custom',
    name: '✨ TCD Personnalisé',
    description: 'Créez votre propre analyse',
    keywords: [],
    config: { rows: [], vals: [] }
  }
]

export function PivotBuilder({ columns, filename }: PivotBuilderProps) {
  const [fields, setFields] = useState<Record<string, Zone>>(
    columns.reduce((acc, col) => ({ ...acc, [col]: 'available' }), {})
  )
  
  const [aggTypes, setAggTypes] = useState<Record<string, string>>({})
  const [pivotData, setPivotData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const fieldId = active.id as string
    const newZone = over.id as Zone
    
    setFields(prev => ({ ...prev, [fieldId]: newZone }))
    
    if (newZone === 'vals' && !aggTypes[fieldId]) {
      setAggTypes(prev => ({ ...prev, [fieldId]: 'SUM' }))
    }
  }

  // Fonction pour trouver la meilleure correspondance de colonne
  const findBestMatch = (keywords: string[]): string | null => {
    for (const keyword of keywords) {
      const match = columns.find(col => 
        col.toLowerCase().includes(keyword.toLowerCase())
      )
      if (match) return match
    }
    return null
  }

  // Appliquer un modèle de TCD
  const applyTemplate = (templateId: string) => {
    const template = PIVOT_TEMPLATES.find(t => t.id === templateId)
    if (!template || templateId === 'custom') {
      setSelectedTemplate(templateId)
      setShowTemplates(false)
      return
    }

    const newFields: Record<string, Zone> = {}
    const newAggTypes: Record<string, string> = {}

    // Réinitialiser tous les champs comme disponibles
    columns.forEach(col => {
      newFields[col] = 'available'
    })

    // Appliquer les lignes du modèle
    template.config.rows.forEach(keyword => {
      const match = findBestMatch([keyword])
      if (match) {
        newFields[match] = 'rows'
      }
    })

    // Appliquer les valeurs du modèle
    template.config.vals.forEach(keyword => {
      const match = findBestMatch([keyword])
      if (match) {
        newFields[match] = 'vals'
        newAggTypes[match] = 'SUM'
      }
    })

    setFields(newFields)
    setAggTypes(newAggTypes)
    setSelectedTemplate(templateId)
    setShowTemplates(false)
  }

  // Obtenir les modèles recommandés basés sur les colonnes disponibles
  const getRecommendedTemplates = () => {
    return PIVOT_TEMPLATES.map(template => {
      if (template.id === 'custom') return { ...template, score: 0 }
      
      const matchCount = template.keywords.filter(keyword =>
        columns.some(col => col.toLowerCase().includes(keyword.toLowerCase()))
      ).length
      
      return { ...template, score: matchCount }
    }).sort((a, b) => b.score - a.score)
  }

  const handleAggregate = async () => {
    setIsLoading(true)
    const rowFields = Object.keys(fields).filter(k => fields[k] === 'rows')
    const colFields = Object.keys(fields).filter(k => fields[k] === 'cols')
    const valFields = Object.keys(fields)
      .filter(k => fields[k] === 'vals')
      .map(k => ({ field: k, agg: aggTypes[k] || 'SUM' }))

    try {
      const res = await fetch(api.pivot, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, rowFields, colFields, valFields })
      })
      const result = await res.json()
      setPivotData(result.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const availableItems = Object.keys(fields).filter(k => fields[k] === 'available')
  const rowItems = Object.keys(fields).filter(k => fields[k] === 'rows')
  const colItems = Object.keys(fields).filter(k => fields[k] === 'cols')
  const valItems = Object.keys(fields).filter(k => fields[k] === 'vals')

  const recommendedTemplates = getRecommendedTemplates()

  return (
    <div className="space-y-6">
      {/* Sélection de modèles */}
      {showTemplates && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🎯</span> Modèles de TCD Suggérés
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sélectionnez un modèle préconfiguré basé sur vos données, puis personnalisez-le selon vos besoins.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                    template.score > 0 && template.id !== 'custom'
                      ? 'border-emerald-500 bg-emerald-50 hover:border-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-700'
                      : 'border-muted bg-card hover:border-primary'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm text-foreground">{template.name}</h3>
                    {template.score > 0 && template.id !== 'custom' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-600 text-white dark:bg-emerald-700 dark:text-white font-semibold">
                        {template.score} match{template.score > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                  {template.score > 0 && template.id !== 'custom' && (
                    <div className="mt-3 pt-3 border-t border-emerald-300 dark:border-emerald-800">
                      <p className="text-xs text-emerald-800 dark:text-emerald-200 font-semibold">
                        ✅ Compatible avec vos données
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                Passer et créer manuellement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Afficher le modèle sélectionné */}
      {!showTemplates && selectedTemplate && selectedTemplate !== 'custom' && (
        <div className="p-3 bg-blue-100 dark:bg-blue-950/40 rounded-md border-2 border-blue-400 dark:border-blue-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              🎯 Modèle appliqué : {PIVOT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
            </span>
            <span className="text-xs text-blue-800 dark:text-blue-200 font-medium">
              (Vous pouvez modifier en glissant-déposant les champs)
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            🔄 Changer de modèle
          </Button>
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-6">
        
        {/* Colonne des champs disponibles */}
        <div className="col-span-1">
          <DroppableZone id="available" title="Champs disponibles" items={availableItems} />
        </div>

        {/* Zones de construction */}
        <div className="col-span-3 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DroppableZone id="rows" title="Lignes" items={rowItems} />
            <DroppableZone id="cols" title="Colonnes" items={colItems} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <Card className="border-2 border-dashed border-muted-foreground/30 min-h-[150px]">
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm text-muted-foreground uppercase flex justify-between">
                    <span>Valeurs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                   <DroppableZone id="vals" title="Glissez pour analyser" items={valItems} />
                   
                   {/* Sélecteurs d'agrégation pour les valeurs */}
                   {valItems.map(item => (
                     <div key={item + '-agg'} className="mt-2 flex items-center gap-2 text-sm justify-end">
                       <span className="font-medium text-foreground">Agrégat ({item}) :</span>
                       <select 
                         className="border-2 px-2 py-1 rounded bg-background text-foreground font-medium"
                         value={aggTypes[item]} 
                         onChange={(e) => setAggTypes(prev => ({...prev, [item]: e.target.value}))}
                       >
                         <option value="SUM">Somme</option>
                         <option value="COUNT">Nombre</option>
                         <option value="AVG">Moyenne</option>
                         <option value="MAX">Max</option>
                         <option value="MIN">Min</option>
                       </select>
                     </div>
                   ))}
                </CardContent>
             </Card>
             
             <DroppableZone id="available" title="Filtres (Bientôt)" items={[]} />
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleAggregate} size="lg" disabled={isLoading}>
              {isLoading ? "Calcul en cours..." : "Actualiser le TCD"}
            </Button>
          </div>
        </div>
      </div>

      {pivotData.length > 0 && (
         <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-foreground">Résultat du TCD</h3>
              <ExportButton
                sheets={[{ name: 'TCD', data: pivotData }]}
                filename="DataMatch_TCD"
                showDropdown={true}
              />
            </div>
            <div className="overflow-x-auto rounded-md border-2 p-1 bg-card">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted">
                   <tr>
                     {Object.keys(pivotData[0]).map(key => (
                       <th key={key} className="px-4 py-3 font-bold text-foreground">{key.replace('_rowKey', 'Lignes').replace('_count', 'Nb Lignes Total')}</th>
                     ))}
                   </tr>
                </thead>
                <tbody>
                   {pivotData.map((row, i) => (
                     <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                       {Object.values(row).map((val: any, j) => (
                         <td key={j} className="px-4 py-3 font-medium text-foreground">
                           {typeof val === 'number' ? new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(val) : val}
                         </td>
                       ))}
                     </tr>
                   ))}
                </tbody>
              </table>
            </div>
         </div>
      )}
    </DndContext>
    </div>
  )
}
