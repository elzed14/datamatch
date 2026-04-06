import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

export interface ExportSheet {
  name: string
  data: Record<string, unknown>[]
}

interface ExportButtonProps {
  sheets: ExportSheet[]
  filename?: string        // nom du fichier sans extension
  label?: string
  disabled?: boolean
  variant?: 'default' | 'outline' | 'secondary'
}

export function ExportButton({
  sheets,
  filename = 'DataMatch_Export',
  label = '⬇ Exporter en Excel',
  disabled = false,
  variant = 'outline',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    if (sheets.length === 0 || sheets.every(s => s.data.length === 0)) {
      setError('Aucune donnée à exporter. Générez d\'abord un résultat.')
      return
    }

    setIsExporting(true)
    setError(null)

    try {
      const res = await fetch(api.export, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets, filename }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error || 'Erreur serveur')
      }

      // Trigger browser download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename + '.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={variant}
        onClick={handleExport}
        disabled={disabled || isExporting}
        className="gap-2"
      >
        {isExporting ? (
          <>
            <span className="animate-spin">⏳</span> Export en cours…
          </>
        ) : (
          label
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive max-w-xs text-right">{error}</p>
      )}
    </div>
  )
}
