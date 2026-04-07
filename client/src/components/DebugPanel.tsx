import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { API_URL, api } from '@/lib/api'

export function DebugPanel() {
  const [logs, setLogs] = useState<string[]>([])
  const [testResult, setTestResult] = useState<any>(null)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const testServerConnection = async () => {
    addLog('🔍 Test de connexion au serveur...')
    addLog(`📍 API_URL: ${API_URL}`)
    
    try {
      addLog('⏳ Tentative de connexion à /api/health...')
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      addLog(`✅ Réponse reçue: ${response.status} ${response.statusText}`)
      
      const data = await response.json()
      addLog(`📦 Données: ${JSON.stringify(data)}`)
      setTestResult(data)
      
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`)
      setTestResult({ error: error.message })
    }
  }

  const testFileUpload = async () => {
    addLog('📤 Test d\'upload de fichier...')
    addLog(`📍 Upload URL: ${api.upload}`)
    
    // Créer un fichier de test
    const testData = [
      { Nom: 'Test1', Valeur: 100 },
      { Nom: 'Test2', Valeur: 200 }
    ]
    
    const csvContent = 'Nom,Valeur\nTest1,100\nTest2,200'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const file = new File([blob], 'test.csv', { type: 'text/csv' })
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      addLog('⏳ Envoi du fichier...')
      const response = await fetch(api.upload, {
        method: 'POST',
        body: formData
      })
      
      addLog(`✅ Réponse: ${response.status} ${response.statusText}`)
      
      const data = await response.json()
      addLog(`📦 Résultat: ${JSON.stringify(data, null, 2)}`)
      setTestResult(data)
      
    } catch (error: any) {
      addLog(`❌ Erreur upload: ${error.message}`)
      setTestResult({ error: error.message })
    }
  }

  const clearLogs = () => {
    setLogs([])
    setTestResult(null)
  }

  return (
    <Card className="border-2 border-blue-500">
      <CardHeader>
        <CardTitle className="text-blue-700">🔧 Panneau de Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Configuration */}
        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono">
          <p><strong>API_URL:</strong> {API_URL}</p>
          <p><strong>Upload Endpoint:</strong> {api.upload}</p>
          <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
          <p><strong>VITE_API_URL:</strong> {import.meta.env.VITE_API_URL || 'non défini'}</p>
        </div>

        {/* Boutons de test */}
        <div className="flex gap-2">
          <Button onClick={testServerConnection} variant="outline">
            🔍 Test Connexion
          </Button>
          <Button onClick={testFileUpload} variant="outline">
            📤 Test Upload
          </Button>
          <Button onClick={clearLogs} variant="destructive">
            🗑️ Effacer
          </Button>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="p-3 bg-black text-green-400 rounded-md font-mono text-xs max-h-60 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        )}

        {/* Résultat */}
        {testResult && (
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="font-semibold mb-2">Résultat:</p>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
