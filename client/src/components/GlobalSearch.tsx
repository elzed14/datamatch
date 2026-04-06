import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Filter, X, Download, Save, Clock, TrendingUp, Sparkles } from 'lucide-react'
import { cacheManager } from '@/lib/cacheManager'

interface GlobalSearchProps {
  filename: string
  columns: string[]
}

interface SearchResult {
  row: number
  matches: Record<string, any>
  score: number
  highlights: Record<string, string>
}

interface SavedSearch {
  id: string
  name: string
  query: string
  filters: Record<string, any>
  timestamp: number
  resultsCount?: number
}

interface SearchSuggestion {
  text: string
  type: 'recent' | 'popular' | 'smart'
  count?: number
}

interface AdvancedFilter {
  column: string
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'isEmpty' | 'isNotEmpty'
  value: string | number
  value2?: string | number // Pour 'between'
}

export function GlobalSearch({ filename, columns }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [searchStats, setSearchStats] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Charger les recherches sauvegardées
    const saved = localStorage.getItem('saved_searches')
    if (saved) {
      setSavedSearches(JSON.parse(saved))
    }

    // Charger les recherches récentes
    const recent = localStorage.getItem('recent_searches')
    if (recent) {
      setRecentSearches(JSON.parse(recent))
    }

    // Charger les recherches populaires
    loadPopularSearches()
  }, [])

  // Charger les recherches populaires depuis le serveur
  const loadPopularSearches = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/popular-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      })
      const result = await response.json()
      if (result.success) {
        setPopularSearches(result.searches)
      }
    } catch (error) {
      console.error('Erreur chargement recherches populaires:', error)
    }
  }

  // Générer des suggestions intelligentes
  const generateSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    const allSuggestions: SearchSuggestion[] = []

    // Suggestions depuis les recherches récentes
    const recentMatches = recentSearches
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(s => ({ text: s, type: 'recent' as const }))
    allSuggestions.push(...recentMatches)

    // Suggestions depuis les recherches populaires
    const popularMatches = popularSearches
      .filter(s => s.text.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
    allSuggestions.push(...popularMatches)

    // Suggestions intelligentes depuis les données
    try {
      const response = await fetch('http://localhost:3001/api/search-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, query, columns: selectedColumns.length > 0 ? selectedColumns : columns })
      })
      const result = await response.json()
      if (result.success) {
        const smartSuggestions = result.suggestions.map((s: any) => ({
          text: s.value,
          type: 'smart' as const,
          count: s.count
        }))
        allSuggestions.push(...smartSuggestions)
      }
    } catch (error) {
      console.error('Erreur suggestions:', error)
    }

    // Dédupliquer et limiter
    const uniqueSuggestions = Array.from(
      new Map(allSuggestions.map(s => [s.text, s])).values()
    ).slice(0, 8)

    setSuggestions(uniqueSuggestions)
  }

  // Debounce pour les suggestions
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (searchQuery) {
      debounceTimer.current = setTimeout(() => {
        generateSuggestions(searchQuery)
      }, 300)
    } else {
      setSuggestions([])
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [searchQuery])

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const addAdvancedFilter = () => {
    setAdvancedFilters(prev => [...prev, {
      column: columns[0],
      operator: 'contains',
      value: ''
    }])
  }

  const updateAdvancedFilter = (index: number, field: keyof AdvancedFilter, value: any) => {
    setAdvancedFilters(prev => prev.map((filter, i) => 
      i === index ? { ...filter, [field]: value } : filter
    ))
  }

  const removeAdvancedFilter = (index: number) => {
    setAdvancedFilters(prev => prev.filter((_, i) => i !== index))
  }

  const performSearch = async (query?: string) => {
    const searchTerm = query || searchQuery
    if (!searchTerm.trim() && advancedFilters.length === 0) return

    setIsSearching(true)
    setShowSuggestions(false)

    // Ajouter aux recherches récentes
    if (searchTerm) {
      const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 10)
      setRecentSearches(updated)
      localStorage.setItem('recent_searches', JSON.stringify(updated))
    }

    try {
      // Vérifier le cache
      const cacheKey = `search_${filename}_${searchTerm}_${JSON.stringify(advancedFilters)}`
      const cachedResults = await cacheManager.get(cacheKey)
      
      if (cachedResults) {
        setResults(cachedResults.results)
        setSearchStats(cachedResults.stats)
        setIsSearching(false)
        return
      }

      const response = await fetch('http://localhost:3001/api/advanced-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          query: searchTerm,
          columns: selectedColumns.length > 0 ? selectedColumns : columns,
          advancedFilters
        })
      })

      const result = await response.json()
      if (result.success) {
        setResults(result.results)
        setSearchStats(result.stats)

        // Mettre en cache (5 minutes)
        await cacheManager.set(cacheKey, { results: result.results, stats: result.stats }, 300000)
      }
    } catch (error) {
      console.error('Erreur recherche:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const saveSearch = () => {
    const name = prompt('Nom de la recherche :')
    if (!name) return

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      query: searchQuery,
      filters: { selectedColumns, advancedFilters },
      timestamp: Date.now(),
      resultsCount: results.length
    }

    const updated = [...savedSearches, newSearch]
    setSavedSearches(updated)
    localStorage.setItem('saved_searches', JSON.stringify(updated))
  }

  const loadSearch = (search: SavedSearch) => {
    setSearchQuery(search.query)
    setSelectedColumns(search.filters.selectedColumns || [])
    setAdvancedFilters(search.filters.advancedFilters || [])
    performSearch(search.query)
  }

  const deleteSearch = (id: string) => {
    const updated = savedSearches.filter(s => s.id !== id)
    setSavedSearches(updated)
    localStorage.setItem('saved_searches', JSON.stringify(updated))
  }

  const exportResults = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/export-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          results: results.map(r => r.matches)
        })
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `search_results_${Date.now()}.xlsx`
      a.click()
    } catch (error) {
      console.error('Erreur export:', error)
    }
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent': return <Clock className="w-3 h-3" />
      case 'popular': return <TrendingUp className="w-3 h-3" />
      case 'smart': return <Sparkles className="w-3 h-3" />
      default: return <Search className="w-3 h-3" />
    }
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'recent': return 'text-blue-600'
      case 'popular': return 'text-green-600'
      case 'smart': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Recherche Globale Avancée
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Barre de recherche avec suggestions */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full h-12 pl-10 pr-4 rounded-md border border-input bg-background text-sm"
                  placeholder="Rechercher dans toutes les données..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  onFocus={() => setShowSuggestions(true)}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSuggestions([])
                      setResults([])
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button onClick={() => performSearch()} disabled={isSearching} size="lg">
                {isSearching ? 'Recherche...' : 'Rechercher'}
              </Button>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="lg"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {/* Suggestions intelligentes */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSearchQuery(suggestion.text)
                      setShowSuggestions(false)
                      performSearch(suggestion.text)
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer transition-colors border-b last:border-0"
                  >
                    <span className={getSuggestionColor(suggestion.type)}>
                      {getSuggestionIcon(suggestion.type)}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{suggestion.text}</div>
                      <div className="text-xs text-muted-foreground">
                        {suggestion.type === 'recent' && 'Recherche récente'}
                        {suggestion.type === 'popular' && `Populaire (${suggestion.count || 0} recherches)`}
                        {suggestion.type === 'smart' && `${suggestion.count || 0} résultats trouvés`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Filtres Avancés</h3>
                <Button onClick={addAdvancedFilter} size="sm" variant="outline">
                  + Ajouter un filtre
                </Button>
              </div>
              
              {/* Liste des filtres avancés */}
              {advancedFilters.map((filter, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    className="col-span-4 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={filter.column}
                    onChange={(e) => updateAdvancedFilter(idx, 'column', e.target.value)}
                  >
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>

                  <select
                    className="col-span-3 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={filter.operator}
                    onChange={(e) => updateAdvancedFilter(idx, 'operator', e.target.value)}
                  >
                    <option value="equals">=</option>
                    <option value="contains">Contient</option>
                    <option value="startsWith">Commence par</option>
                    <option value="endsWith">Finit par</option>
                    <option value="greaterThan">&gt;</option>
                    <option value="lessThan">&lt;</option>
                    <option value="between">Entre</option>
                    <option value="isEmpty">Est vide</option>
                    <option value="isNotEmpty">N'est pas vide</option>
                  </select>

                  {filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty' && (
                    <input
                      type="text"
                      className="col-span-4 h-9 rounded-md border border-input bg-background px-2 text-sm"
                      placeholder="Valeur..."
                      value={filter.value}
                      onChange={(e) => updateAdvancedFilter(idx, 'value', e.target.value)}
                    />
                  )}

                  {filter.operator === 'between' && (
                    <input
                      type="text"
                      className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
                      placeholder="Et..."
                      value={filter.value2 || ''}
                      onChange={(e) => updateAdvancedFilter(idx, 'value2', e.target.value)}
                    />
                  )}

                  <button
                    onClick={() => removeAdvancedFilter(idx)}
                    className="col-span-1 h-9 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Sélection des colonnes */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">
                  Rechercher uniquement dans ces colonnes :
                </label>
                <div className="flex flex-wrap gap-2">
                  {columns.map(col => (
                    <span
                      key={col}
                      onClick={() => toggleColumn(col)}
                      className={`px-2 py-1 text-xs rounded-md cursor-pointer transition-all ${
                        selectedColumns.includes(col)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border hover:bg-muted'
                      }`}
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recherches sauvegardées */}
          {savedSearches.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Recherches Sauvegardées
              </h3>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map(search => (
                  <div
                    key={search.id}
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm group"
                  >
                    <button
                      onClick={() => loadSearch(search)}
                      className="hover:text-primary flex items-center gap-2"
                    >
                      <span className="font-medium">{search.name}</span>
                      {search.resultsCount !== undefined && (
                        <span className="text-xs text-muted-foreground">({search.resultsCount})</span>
                      )}
                    </button>
                    <button
                      onClick={() => deleteSearch(search.id)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques */}
      {searchStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Résultats</div>
              <div className="text-3xl font-bold text-blue-600">{searchStats.totalResults}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Colonnes Matchées</div>
              <div className="text-3xl font-bold text-purple-600">{searchStats.columnsMatched}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Temps de Recherche</div>
              <div className="text-3xl font-bold text-green-600">{searchStats.searchTime}ms</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Pertinence Moy.</div>
              <div className="text-3xl font-bold text-orange-600">{searchStats.avgScore?.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Résultats */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Résultats ({results.length})</span>
              <div className="flex gap-2">
                <Button onClick={saveSearch} variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
                <Button onClick={exportResults} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.slice(0, 50).map((result, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Ligne {result.row}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {result.score}% pertinence
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(result.matches).map(([col, value]) => (
                      <div key={col}>
                        <span className="font-medium text-muted-foreground">{col}: </span>
                        <span dangerouslySetInnerHTML={{ 
                          __html: result.highlights?.[col] || String(value) 
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {results.length > 50 && (
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    ... et {results.length - 50} autres résultats
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aucun résultat */}
      {searchQuery && results.length === 0 && !isSearching && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="font-bold text-orange-800 mb-1">Aucun résultat</h3>
            <p className="text-sm text-orange-700">
              Essayez avec d'autres mots-clés ou ajustez vos filtres
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
