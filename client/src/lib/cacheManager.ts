// Cache Manager pour DataMatch Pro
// Gère le cache des données côté client avec IndexedDB et LocalStorage

interface CacheEntry {
  key: string
  data: any
  timestamp: number
  size: number
  ttl: number // Time to live en millisecondes
}

class CacheManager {
  private static instance: CacheManager
  private dbName = 'DataMatchCache'
  private dbVersion = 1
  private db: IDBDatabase | null = null
  private memoryCache: Map<string, CacheEntry> = new Map()
  private maxMemorySize = 50 * 1024 * 1024 // 50MB en mémoire
  private currentMemorySize = 0

  private constructor() {
    this.initDB()
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
      }
    })
  }

  // Calculer la taille approximative d'un objet
  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size
  }

  // Nettoyer le cache mémoire si nécessaire
  private cleanMemoryCache(): void {
    if (this.currentMemorySize > this.maxMemorySize) {
      // Supprimer les entrées les plus anciennes
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)

      while (this.currentMemorySize > this.maxMemorySize * 0.7 && entries.length > 0) {
        const [key, entry] = entries.shift()!
        this.memoryCache.delete(key)
        this.currentMemorySize -= entry.size
      }
    }
  }

  // Sauvegarder dans le cache
  async set(key: string, data: any, ttl: number = 3600000): Promise<void> {
    const size = this.calculateSize(data)
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      size,
      ttl
    }

    // Cache mémoire
    this.memoryCache.set(key, entry)
    this.currentMemorySize += size
    this.cleanMemoryCache()

    // Cache IndexedDB pour persistance
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        await store.put(entry)
      } catch (error) {
        console.error('Erreur sauvegarde cache IndexedDB:', error)
      }
    }

    // Cache LocalStorage pour petites données
    if (size < 1024 * 100) { // < 100KB
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry))
      } catch (error) {
        // LocalStorage plein, ignorer
      }
    }
  }

  // Récupérer du cache
  async get(key: string): Promise<any | null> {
    // 1. Vérifier cache mémoire (le plus rapide)
    const memEntry = this.memoryCache.get(key)
    if (memEntry) {
      if (Date.now() - memEntry.timestamp < memEntry.ttl) {
        return memEntry.data
      } else {
        this.memoryCache.delete(key)
        this.currentMemorySize -= memEntry.size
      }
    }

    // 2. Vérifier LocalStorage
    try {
      const lsData = localStorage.getItem(`cache_${key}`)
      if (lsData) {
        const entry: CacheEntry = JSON.parse(lsData)
        if (Date.now() - entry.timestamp < entry.ttl) {
          // Remettre en cache mémoire
          this.memoryCache.set(key, entry)
          this.currentMemorySize += entry.size
          return entry.data
        } else {
          localStorage.removeItem(`cache_${key}`)
        }
      }
    } catch (error) {
      // Ignorer erreurs LocalStorage
    }

    // 3. Vérifier IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readonly')
        const store = transaction.objectStore('cache')
        const request = store.get(key)

        return new Promise((resolve) => {
          request.onsuccess = () => {
            const entry: CacheEntry = request.result
            if (entry && Date.now() - entry.timestamp < entry.ttl) {
              // Remettre en cache mémoire
              this.memoryCache.set(key, entry)
              this.currentMemorySize += entry.size
              resolve(entry.data)
            } else {
              resolve(null)
            }
          }
          request.onerror = () => resolve(null)
        })
      } catch (error) {
        console.error('Erreur lecture cache IndexedDB:', error)
      }
    }

    return null
  }

  // Supprimer du cache
  async remove(key: string): Promise<void> {
    // Mémoire
    const entry = this.memoryCache.get(key)
    if (entry) {
      this.memoryCache.delete(key)
      this.currentMemorySize -= entry.size
    }

    // LocalStorage
    localStorage.removeItem(`cache_${key}`)

    // IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        await store.delete(key)
      } catch (error) {
        console.error('Erreur suppression cache IndexedDB:', error)
      }
    }
  }

  // Vider tout le cache
  async clear(): Promise<void> {
    // Mémoire
    this.memoryCache.clear()
    this.currentMemorySize = 0

    // LocalStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'))
    keys.forEach(k => localStorage.removeItem(k))

    // IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        await store.clear()
      } catch (error) {
        console.error('Erreur vidage cache IndexedDB:', error)
      }
    }
  }

  // Obtenir les statistiques du cache
  getStats(): { memorySize: number; memoryEntries: number; maxSize: number } {
    return {
      memorySize: this.currentMemorySize,
      memoryEntries: this.memoryCache.size,
      maxSize: this.maxMemorySize
    }
  }
}

export const cacheManager = CacheManager.getInstance()
