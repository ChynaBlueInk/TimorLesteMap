// app/trips/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { calculateTripStats, getPublicTrips, type Trip } from "@/lib/trips"
import { Route, Car, Calendar, MapPin, PlusCircle } from "lucide-react"

export default function PublicTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getPublicTrips()
        setTrips(data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Public Trips</h1>
          <p className="text-muted-foreground">
            Browse itineraries shared by the community. Open one to view details and copy it into your own planner.
          </p>
        </div>
        <Button asChild>
          <Link href="/plan-trip">
            <PlusCircle className="mr-2 h-4 w-4" />
            Plan a Trip
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading public trips…</p>
      ) : trips.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trips.map((trip) => {
            const stats = calculateTripStats(trip)
            const mode = trip.transportMode ?? "car"
            const roads = trip.roadCondition ?? "mixed"

            return (
              <Card key={trip.id} className="hover:shadow-sm transition">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    <Link className="hover:underline" href={`/trips/${trip.id}`}>
                      {trip.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trip.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{trip.description}</p>
                  )}

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Route className="h-4 w-4" />
                      {Math.round(stats.totalDistance)} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Car className="h-4 w-4" />
                      {Math.round(stats.totalTime)} hrs
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {stats.estimatedDays} days
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {trip.places.length} stops
                    </span>
                  </div>

                  {/* Meta badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs capitalize">{mode}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{roads}</Badge>

                    {/* Updated time (friendly) */}
                    <span className="text-xs text-muted-foreground ml-auto">
                      Updated {new Date(trip.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Link */}
                  <div className="pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/trips/${trip.id}`}>View trip</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-8">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-2">No public trips yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Be the first to share an itinerary! Plan a trip and mark it as public so others can try it.
          </p>
          <Button asChild>
            <Link href="/plan-trip">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create your first trip
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
