interface TableDataProps {
  columns: string[]
  data: any[]
}

export function DataTable({ columns, data }: TableDataProps) {
  if (!columns.length || !data.length) {
    return <p className="text-muted-foreground">Aucune donnée à afficher.</p>
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3 font-medium whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-4 py-3 truncate max-w-[200px]" title={String(row[col] || '')}>
                  {row[col] !== undefined && row[col] !== null ? String(row[col]) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
