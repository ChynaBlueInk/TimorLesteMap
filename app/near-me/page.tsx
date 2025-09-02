// app/near-me/page.tsx
"use client"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

import { useEffect, useState } from "react"
import NextDynamic from "next/dynamic"
import Navigation from "@/components/Navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Navigation as NavIcon, MapPin } from "lucide-react"
import { getNearby, getPlaces, type Place } from "@/lib/firestore"

const MapView = NextDynamic(() => import("@/components/MapView"), { ssr: false })

export default function NearMePage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [places, setPlaces] = useState<Place[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported in this browser.")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        try {
          const near = await getNearby(latitude, longitude, 50) // 50km
          setPlaces(near.length ? near : await getPlaces())
        } catch (e: any) {
          setError(e?.message || "Failed to load nearby places")
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        setError(err.message || "Failed to get your location")
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <NavIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Near Me</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="h-[70vh]">
            <MapView
              places={places}
              center={coords ?? [-8.8742, 125.7275]}
              showUserLocation={!!coords}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
