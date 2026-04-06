import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMemo, useEffect } from 'react'

// Fix for Leaflet default icon issues in React
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

// Mini-database of coordinates for common cities (Fallback for demo)
const CITY_COORDS: Record<string, [number, number]> = {
    'paris': [48.8566, 2.3522],
    'london': [51.5074, -0.1278],
    'new york': [40.7128, -74.0060],
    'tokyo': [35.6762, 139.6503],
    'dakar': [14.7167, -17.4677],
    'abidjan': [5.3600, -4.0083],
    'casablanca': [33.5731, -7.5898],
    'lagos': [6.5244, 3.3792],
    'nairobi': [-1.2921, 36.8219],
    'johannesburg': [-26.2041, 28.0473],
    'lyon': [45.7640, 4.8357],
    'marseille': [43.2965, 5.3698],
    'douala': [4.0511, 9.7679],
    'yaounde': [3.8480, 11.5021],
    'yaoundé': [3.8480, 11.5021],
    'lome': [6.1375, 1.2125],
    'lomé': [6.1375, 1.2125],
    'cotonou': [6.3667, 2.4333],
    'libreville': [0.4162, 9.4673],
    'bamako': [12.6392, -8.0029],
    'ouagadougou': [12.3714, -1.5197],
    'niamey': [13.5127, 2.1126],
    'conakry': [9.5092, -13.7122],
    'kinshasa': [-4.4419, 15.2663],
    'brazzaville': [-4.2634, 15.2429],
    'tunis': [36.8065, 10.1815],
    'alger': [36.7538, 3.0588],
}

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

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap()
    useEffect(() => {
        map.setView(center, map.getZoom())
    }, [center, map])
    return null
}

export function GeoMap({ data, cityCol, valueCol }: GeoMapProps) {
    const points = useMemo(() => {
        const result: GeoPoint[] = []
        data.forEach(item => {
            const cityName = String(item._rowKey || '').toLowerCase().trim()
            const coords = CITY_COORDS[cityName]
            if (coords) {
                result.push({
                    name: String(item._rowKey),
                    lat: coords[0],
                    lng: coords[1],
                    value: Number(item[`Grand Total - ${valueCol} (SUM)`] || 0),
                    count: Number(item._count || 0)
                })
            }
        })
        return result
    }, [data, valueCol])

    const center = useMemo(() => {
        if (points.length > 0) {
            return [points[0].lat, points[0].lng] as [number, number]
        }
        return [14.0, -1.0] as [number, number] // Center of West Africa
    }, [points])

    if (points.length === 0) return null

    return (
        <Card className="overflow-hidden border-sky-100 shadow-sm">
            <CardHeader className="bg-sky-50/30">
                <CardTitle className="text-sm flex items-center gap-2 text-sky-900">
                    🌍 Répartition Géographique (Basée sur {cityCol})
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div style={{ height: '400px', width: '100%' }}>
                    <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ChangeView center={center} />
                        {points.map((p, i) => (
                            <Marker key={i} position={[p.lat, p.lng]}>
                                <Popup>
                                    <div className="text-xs">
                                        <p className="font-bold border-b pb-1 mb-1">{p.name}</p>
                                        <p><strong>Total:</strong> {new Intl.NumberFormat('fr-FR').format(p.value)}</p>
                                        <p><strong>Volume:</strong> {p.count} ligne(s)</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </CardContent>
        </Card>
    )
}
