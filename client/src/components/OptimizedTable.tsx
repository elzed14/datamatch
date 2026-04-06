import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react'
import { cacheManager } from '@/lib/cacheManager'

interface OptimizedTableProps {
  filename: string
  columns: string[]
  totalRows: number
}

export function OptimizedTable({ filename, columns, totalRows }: OptimizedTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.ceil(totalRows / pageSize)

  // Charger une page de données
  const loadPage = useCallback(async (page: number, useCache: boolean = true) => {
    const cacheKey = `${filename}_page_${page}_size_${pageSize}`

    // Vérifier le cache
    if (useCache) {
      const cachedData = await cacheManager.get(cacheKey)
      if (cachedData) {
        console.log(`📦 Page ${page} chargée depuis le cache`)
        return cachedData
      }
    }

    // Charger depuis le serveur
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/paginated-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          page,
          pageSize
        })
      })

      const result = await response.json()
      if (result.success) {
        // Mettre en cache (TTL: 10 minutes)
        await cacheManager.set(cacheKey, result.data, 600000)
        console.log(`🌐 Page ${page} chargée depuis le serveur`)
        return result.data
      }
    } catch (error) {
      console.error('Erreur chargement page:', error)
    } finally {
      setIsLoading(false)
    }

    return []
  }, [filename, pageSize])

  // Précharger les pages adjacentes
  const preloadAdjacentPages = useCallback(async (page: number) => {
    const pagesToPreload = [page + 1, page + 2].filter(p => p <= totalPages && !loadedPages.has(p))
    
    for (const p of pagesToPreload) {
      loadPage(p, true).then(() => {
        setLoadedPages(prev => new Set(prev).add(p))
      })
    }
  }, [loadPage, totalPages, loadedPages])

  // Charger la page courante
  useEffect(() => {
    const loadCurrentPage = async () => {
      const pageData = await loadPage(currentPage)
      setData(pageData)
      setLoadedPages(prev => new Set(prev).add(currentPage))
      
      // Précharger les pages suivantes
      preloadAdjacentPages(currentPage)
    }

    loadCurrentPage()
  }, [currentPage, loadPage, preloadAdjacentPages])

  // Lazy loading avec Intersection Observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentPage < totalPages && !isLoading) {
          setCurrentPage(prev => prev + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (bottomRef.current) {
      observerRef.current.observe(bottomRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [currentPage, totalPages, isLoading])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const startRow = (currentPage - 1) * pageSize + 1
  const endRow = Math.min(currentPage * pageSize, totalRows)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Données ({totalRows.toLocaleString('fr-FR')} lignes)</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <span className="text-muted-foreground">
              Lignes {startRow} - {endRow}
            </span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
                setLoadedPages(new Set())
              }}
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={200}>200 / page</option>
            </select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground uppercase sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">
                    {startRow + idx}
                  </td>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-4 py-3 truncate max-w-[200px]">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
          </div>
        )}

        {/* Intersection observer target */}
        <div ref={bottomRef} className="h-4" />

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
            {loadedPages.size > 1 && (
              <span className="ml-2">
                ({loadedPages.size} pages en cache)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Pages numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="w-8"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Cache stats */}
        <div className="mt-4 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
          💡 Les pages sont mises en cache pour un chargement instantané. 
          Les pages suivantes sont préchargées automatiquement.
        </div>
      </CardContent>
    </Card>
  )
}
