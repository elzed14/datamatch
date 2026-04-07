import React, { useState, useRef } from 'react'
import { UploadCloud } from 'lucide-react'

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
}

export function UploadZone({ onFileSelect, isLoading }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0])
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer flex flex-col items-center
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium">Déposer un fichier ou cliquer pour parcourir</p>
      <p className="text-sm text-muted-foreground mt-2">
        Supporte .xlsx, .xls jusqu'à 50MB
      </p>
      {isLoading && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <p className="text-primary font-semibold">Chargement en cours...</p>
          </div>
          <p className="text-xs text-muted-foreground">
            ⏳ Si c'est la première utilisation, le serveur peut prendre 30-60 secondes à démarrer.
          </p>
          <p className="text-xs text-blue-600 font-medium">
            💡 Merci de patienter, ne fermez pas cette page.
          </p>
        </div>
      )}
    </div>
  )
}
