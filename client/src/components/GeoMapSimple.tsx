import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GeoPoint {
    name: string
    lat: number
    lng: number
    value: number
    count: number
}

interface GeoMapProps {
    data: any[] // data returned from fetch
    cityCol: string
    valueCol: string
}

export function GeoMap({ data, cityCol, valueCol }: GeoMapProps) {
    const points = useMemo(() => {
        const result: GeoPoint[] = []
        data.forEach(item => {
            const cityName = String(item._rowKey || '').toLowerCase().trim()
            // Simplified - just use the city name without coordinates
            if (cityName) {
                result.push({
                    name: String(item._rowKey),
                    lat: 0, // Placeholder
                    lng: 0, // Placeholder
                    value: Number(item[`Grand Total - ${valueCol} (SUM)`] || 0),
                    count: Number(item._count || 0)
                })
            }
        })
        return result
    }, [data, valueCol])

    if (points.length === 0) return null

    return (
        <Card className="overflow-hidden border-sky-100 shadow-sm">
            <CardHeader className="bg-sky-50/30">
                <CardTitle className="text-sm flex items-center gap-2 text-sky-900">
                    🌍 Répartition Géographique (Basée sur {cityCol})
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                            La carte géographique sera affichée ici lorsque Leaflet sera correctement configuré
                        </p>
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                            {points.map((p, i) => (
                                <div key={i} className="p-2 bg-sky-50 rounded text-sm">
                                    <p className="font-bold">{p.name}</p>
                                    <p>Total: {new Intl.NumberFormat('fr-FR').format(p.value)}</p>
                                    <p>Volume: {p.count} ligne(s)</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}