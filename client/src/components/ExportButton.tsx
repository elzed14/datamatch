import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, FileSpreadsheet, FileText } from 'lucide-react'

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
  showDropdown?: boolean   // Afficher le menu déroulant Excel/PDF
}

export function ExportButton({
  sheets,
  filename = 'DataMatch_Export',
  label = '⬇ Exporter',
  disabled = false,
  variant = 'outline',
  showDropdown = true,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExportExcel = async () => {
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

  const handleExportPDF = async () => {
    if (sheets.length === 0 || sheets.every(s => s.data.length === 0)) {
      setError('Aucune donnée à exporter. Générez d\'abord un résultat.')
      return
    }

    setIsExporting(true)
    setError(null)

    try {
      const doc = new jsPDF('l', 'mm', 'a4') // Landscape, millimeters, A4
      
      sheets.forEach((sheet, index) => {
        if (index > 0) {
          doc.addPage()
        }

        // Titre de la feuille
        doc.setFontSize(16)
        doc.setTextColor(67, 56, 202) // Indigo
        doc.text(sheet.name, 14, 15)

        // Date et info
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 22)
        doc.text(`${sheet.data.length} lignes`, 14, 27)

        if (sheet.data.length > 0) {
          const columns = Object.keys(sheet.data[0])
          const rows = sheet.data.map(row => columns.map(col => {
            const val = row[col]
            if (val === null || val === undefined) return ''
            if (typeof val === 'number') return val.toLocaleString('fr-FR')
            return String(val)
          }))

          // Tableau avec autoTable
          autoTable(doc, {
            head: [columns],
            body: rows,
            startY: 32,
            theme: 'grid',
            styles: {
              fontSize: 8,
              cellPadding: 2,
            },
            headStyles: {
              fillColor: [67, 56, 202], // Indigo
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center',
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252], // Slate 50
            },
            columnStyles: columns.reduce((acc, col, idx) => {
              // Détecter les colonnes numériques
              const isNumeric = sheet.data.some(row => typeof row[col] === 'number')
              if (isNumeric) {
                acc[idx] = { halign: 'right' }
              }
              return acc
            }, {} as any),
            margin: { top: 32, right: 14, bottom: 14, left: 14 },
          })

          // Pied de page
          const pageCount = (doc as any).internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.setTextColor(150, 150, 150)
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.text(
              `Page ${i} sur ${pageCount} - © DataMatch Pro`,
              doc.internal.pageSize.getWidth() / 2,
              doc.internal.pageSize.getHeight() - 10,
              { align: 'center' }
            )
          }
        }
      })

      // Télécharger le PDF
      doc.save(filename + '.pdf')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {showDropdown ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              disabled={disabled || isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <span className="animate-spin">⏳</span> Export en cours…
                </>
              ) : (
                <>
                  {label}
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
              Exporter en Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
              <FileText className="mr-2 h-4 w-4 text-red-600" />
              Exporter en PDF (.pdf)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant={variant}
          onClick={handleExportExcel}
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
      )}
      {error && (
        <p className="text-xs text-destructive max-w-xs text-right">{error}</p>
      )}
    </div>
  )
}
