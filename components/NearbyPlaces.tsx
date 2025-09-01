"use client"

import { useState, useEffect, useMemo } from "react"
import { getPlaces, type Place } from "@/lib/firestore"
import { calculateDistance } from "@/lib/trips"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useTranslation, type Language } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MapView from "./MapView"
import { MapPin, Navigation, AlertCircle, Loader2, Filter, Map, List } from "lucide-react"
import Link from "next/link"

interface NearbyPlace extends Place {
  distance: number
}

interface NearbyPlacesProps {
  language?: Language
}

export default function NearbyPlaces({ language = "en" }: NearbyPlacesProps) {
  const { t } = useTranslation(language)
  const { coords, loading: locationLoading, error: locationError, requestLocation } = useGeolocation()

  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [radiusFilter, setRadiusFilter] = useState<number>(50) // km
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  useEffect(() => {
    loadPlaces()
  }, [])

  const loadPlaces = async () => {
    try {
      setLoading(true)
      const placesData = await getPlaces({ status: "published" })
      setPlaces(placesData)
    } catch (error) {
      console.error("Error loading places:", error)
      setError("Failed to load places")
    } finally {
      setLoading(false)
    }
  }

  const nearbyPlaces = useMemo(() => {
    if (!coords || places.length === 0) return []

    const placesWithDistance: NearbyPlace[] = places
      .map((place) => ({
        ...place,
        distance: calculateDistance(coords, place.coords),
      }))
      .filter((place) => {
        const withinRadius = place.distance <= radiusFilter
        const matchesCategory = categoryFilter === "all" || place.category === categoryFilter
        return withinRadius && matchesCategory
      })
      .sort((a, b) => a.distance - b.distance)

    return placesWithDistance
  }, [coords, places, radiusFilter, categoryFilter])

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "history", label: t("category.history") },
    { value: "culture", label: t("category.culture") },
    { value: "nature", label: t("category.nature") },
    { value: "food", label: t("category.food") },
    { value: "memorials", label: t("category.memorials") },
  ]

  const radiusOptions = [
    { value: 5, label: "5 km" },
    { value: 10, label: "10 km" },
    { value: 25, label: "25 km" },
    { value: 50, label: "50 km" },
    { value: 100, label: "100 km" },
    { value: 200, label: "200 km" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading places...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Location Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Your Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locationError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          ) : coords ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
              </div>
              <Badge variant="secondary">Location Found</Badge>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">We need your location to show nearby places</p>
              <Button onClick={requestLocation} disabled={locationLoading}>
                {locationLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Get My Location
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {coords && (
        <>
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Distance</label>
                  <Select value={radiusFilter.toString()} onValueChange={(value) => setRadiusFilter(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {radiusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          Within {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>
                Nearby Places ({nearbyPlaces.length} found within {radiusFilter}km)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nearbyPlaces.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No places found nearby</h3>
                  <p className="text-muted-foreground mb-4">
                    Try increasing the distance radius or changing the category filter
                  </p>
                  <Button variant="outline" onClick={() => setRadiusFilter(100)}>
                    Expand to 100km
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue="list" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list" className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      List View
                    </TabsTrigger>
                    <TabsTrigger value="map" className="flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      Map View
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="list" className="mt-4">
                    <div className="space-y-4">
                      {nearbyPlaces.map((place) => (
                        <Card key={place.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <Link href={`/places/${place.id}`} className="hover:underline">
                                  <h3 className="font-medium text-lg">{place.title}</h3>
                                </Link>
                                <p className="text-sm text-muted-foreground mb-2">{place.municipality}</p>
                                <p className="text-sm line-clamp-2 mb-3">{place.description}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{t(`category.${place.category}`)}</Badge>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Navigation className="h-3 w-3" />
                                    <span>{place.distance.toFixed(1)} km away</span>
                                  </div>
                                </div>
                              </div>
                              {place.images.length > 0 && (
                                <img
                                  src={place.images[0] || "/placeholder.svg"}
                                  alt={place.title}
                                  className="w-20 h-20 object-cover rounded-md ml-4"
                                />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="map" className="mt-4">
                    <div className="h-96 rounded-lg overflow-hidden">
                      <MapView
                        places={nearbyPlaces}
                        center={coords}
                        zoom={10}
                        showUserLocation={true}
                        language={language}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
