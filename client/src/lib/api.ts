export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Configuration de timeout et retry pour améliorer la stabilité
export const API_CONFIG = {
  timeout: 120000, // 120 secondes (2 minutes) pour le cold start de Render
  retries: 3,
  retryDelay: 2000 // 2 secondes
}

// Fonction helper pour les requêtes avec retry
export async function fetchWithRetry(url: string, options: RequestInit = {}, retries = API_CONFIG.retries): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay))
      return fetchWithRetry(url, options, retries - 1)
    }
    
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay))
      return fetchWithRetry(url, options, retries - 1)
    }
    
    throw error
  }
}

export const api = {
  upload: `${API_URL}/api/upload`,
  merge: `${API_URL}/api/merge`,
  analyzeKeys: `${API_URL}/api/analyze-keys`,
  pivot: `${API_URL}/api/pivot`,
  export: `${API_URL}/api/export`,
  profile: `${API_URL}/api/profile`,
  clean: `${API_URL}/api/clean`,
  detectAnomalies: `${API_URL}/api/detect-anomalies`,
  waterfall: `${API_URL}/api/waterfall`,
  cleanAdvanced: `${API_URL}/api/clean-advanced`,
  widgetData: `${API_URL}/api/widget-data`,
  cohortAnalysis: `${API_URL}/api/cohort-analysis`,
  globalSearch: `${API_URL}/api/global-search`,
  exportSearch: `${API_URL}/api/export-search`,
  exportAdvanced: `${API_URL}/api/export-advanced`,
  exportChart: `${API_URL}/api/export-chart`,
  paginatedData: `${API_URL}/api/paginated-data`,
  searchSuggestions: `${API_URL}/api/search-suggestions`,
  popularSearches: `${API_URL}/api/popular-searches`,
  advancedSearch: `${API_URL}/api/advanced-search`,
  download: (filename: string) => `${API_URL}/api/download/${filename}`
}
