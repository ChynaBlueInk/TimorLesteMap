// components/TripRouteMap.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet"
import L, { LatLngLiteral, Icon } from "leaflet"
import type { TransportMode } from "@/lib/trips"

// --- Default Leaflet marker fix (Next.js bundling)
import marker2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
const DefaultIcon: Icon = L.icon({
  iconUrl: (markerIcon as unknown as { src?: string }).src ?? (markerIcon as unknown as string),
  iconRetinaUrl: (marker2x as unknown as { src?: string }).src ?? (marker2x as unknown as string),
  shadowUrl: (markerShadow as unknown as { src?: string }).src ?? (markerShadow as unknown as string),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon
// --- end fix

type Props = {
  waypoints: { lat: number; lng: number }[]
  transportMode: TransportMode
  height?: number // px
}

type OsrmFeature = {
  geometry: { coordinates: [number, number][] } // [lon, lat]
}

const profileForMode = (mode: TransportMode) =>
  mode === "bicycle" ? "cycling" : mode === "walking" ? "foot" : "driving"

// chunk long waypoint arrays so OSRM is more reliable
const chunkWaypoints = (pts: { lat: number; lng: number }[], size = 10) => {
  if (pts.length <= size) return [pts]
  const chunks: { lat: number; lng: number }[][] = []
  for (let i = 0; i < pts.length; i += (size - 1)) {
    const end = Math.min(i + size, pts.length)
    const slice = pts.slice(i, end)
    if (i > 0) slice.unshift(pts[i]) // overlap 1 point
    chunks.push(slice)
  }
  return chunks
}

// fit bounds after render when waypoints change
function FitBounds({ bounds }: { bounds?: [[number, number], [number, number]] }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [20, 20] })
  }, [bounds, map])
  return null
}

// simple colored dot markers for start/end
const dotIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<span style="
      display:inline-block;width:16px;height:16px;border-radius:50%;
      background:${color};border:2px solid white;box-shadow:0 0 0 2px ${color}33;
      "></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })

const startIcon = dotIcon("#16a34a") // green
const endIcon = dotIcon("#dc2626")   // red

export default function TripRouteMap({ waypoints, transportMode, height = 360 }: Props) {
  const [route, setRoute] = useState<LatLngLiteral[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const bounds = useMemo(() => {
    if (!waypoints.length) return undefined
    const lats = waypoints.map(p => p.lat)
    const lngs = waypoints.map(p => p.lng)
    const south = Math.min(...lats), north = Math.max(...lats)
    const west = Math.min(...lngs), east = Math.max(...lngs)
    return [[south, west], [north, east]] as [[number, number],[number, number]]
  }, [waypoints])

  useEffect(() => {
    let cancelled = false
    setError(null)
    setRoute(null)
    if (waypoints.length < 2) return

    const profile = profileForMode(transportMode)
    const chunks = chunkWaypoints(waypoints, 10)

    const fetchChunk = async (pts: { lat: number; lng: number }[]) => {
      const coords = pts.map(p => `${p.lng},${p.lat}`).join(";") // OSRM expects lon,lat
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`OSRM ${res.status}`)
      const data = await res.json()
      const feat = (data?.routes?.[0]) as OsrmFeature | undefined
      if (!feat) throw new Error("No route")
      const latlngs: LatLngLiteral[] = feat.geometry.coordinates.map(([lon, lat]) => ({ lat, lng: lon }))
      return latlngs
    }

    ;(async () => {
      try {
        const segments: LatLngLiteral[][] = []
        for (const chunk of chunks) {
          // eslint-disable-next-line no-await-in-loop
          const seg = await fetchChunk(chunk)
          segments.push(seg)
        }
        const stitched = segments.reduce<LatLngLiteral[]>((acc, seg, i) => {
          if (i === 0) return seg.slice()
          return acc.concat(seg.slice(1)) // drop duplicate
        }, [])
        if (!cancelled) setRoute(stitched)
      } catch {
        // graceful fallback: straight lines between points
        if (!cancelled) {
          setError("Routing server unreachable — showing straight lines.")
          setRoute(waypoints)
        }
      }
    })()

    return () => { cancelled = true }
  }, [waypoints, transportMode])

  const start = waypoints[0]
  const end = waypoints[waypoints.length - 1]

  return (
    <div className="w-full" style={{ height }}>
      <MapContainer
        className="h-full w-full"
        scrollWheelZoom={false}
        attributionControl={false}
        zoomControl={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {bounds ? <FitBounds bounds={bounds} /> : null}
        {route && <Polyline positions={route} />}
        {start ? <Marker position={start} icon={startIcon} /> : null}
        {/* show end only if different from start */}
        {end && (end.lat !== start?.lat || end.lng !== start?.lng) ? (
          <Marker position={end} icon={endIcon} />
        ) : null}
      </MapContainer>
      {error ? <p className="mt-2 text-xs text-muted-foreground">{error}</p> : null}
    </div>
  )
}
