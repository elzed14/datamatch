export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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
