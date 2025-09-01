// app/map/page.tsx
"use client"

export const dynamic = "force-dynamic"
export const revalidate = false


import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import nextDynamic from "next/dynamic"
import { useSearch } from "@/hooks/useSearch"
import SearchFilters from "@/components/SearchFilters"
import { useTranslation, type Language } from "@/lib/i18n"
import Navigation from "@/components/Navigation"
import PlaceCard from "@/components/PlaceCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { List, MapPin, Loader2, X, Grid, Map } from "lucide-react"
import type { Place } from "@/lib/firestore"

// ✅ no name clash: alias the import
const MapView = nextDynamic(() => import("@/components/MapView"), { ssr: false })

function MapPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [language, setLanguage] = useState<Language>("en")
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [view, setView] = useState<"map" | "grid">("map")

  const { t } = useTranslation(language)

  const initialFilters = {
    query: searchParams.get("q") || "",
    categories: searchParams.get("categories")?.split(",").filter(Boolean) || [],
    municipalities: searchParams.get("municipalities")?.split(",").filter(Boolean) || [],
    featured: searchParams.get("featured") === "true",
    hasImages: searchParams.get("hasImages") === "true",
    yearRange: [1500, 2024] as [number, number],
    sortBy: (searchParams.get("sortBy") as any) || "relevance",
  }

  const { filters, setFilters, places, municipalities, loading, error, totalResults } = useSearch(initialFilters)

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    const params = new URLSearchParams()
    if (newFilters.query) params.set("q", newFilters.query)
    if (Array.isArray(newFilters.categories) && newFilters.categories.length > 0)
      params.set("categories", newFilters.categories.join(","))
    if (Array.isArray(newFilters.municipalities) && newFilters.municipalities.length > 0)
      params.set("municipalities", newFilters.municipalities.join(","))
    if (newFilters.featured) params.set("featured", "true")
    if (newFilters.hasImages) params.set("hasImages", "true")
    if (newFilters.sortBy && newFilters.sortBy !== "relevance") params.set("sortBy", newFilters.sortBy)
    const newUrl = params.toString() ? `/map?${params.toString()}` : "/map"
    router.replace(newUrl, { scroll: false })
  }

  const handleViewDetails = (place: Place) => {
    router.push(`/places/${place.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} onLanguageChange={setLanguage} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t("message.loading")}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} onLanguageChange={setLanguage} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Places</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const safePlaces: Place[] = Array.isArray(places) ? places : []

  // Ensure SearchFilters gets strictly-typed values (no undefined)
  const uiFilters = {
    query: filters.query || "",
    categories: filters.categories || [],
    municipalities: filters.municipalities || [],
    featured: !!filters.featured,
    hasImages: !!filters.hasImages,
    yearRange: (filters.yearRange || [1500, 2024]) as [number, number],
    sortBy: (filters.sortBy as any) || "relevance",
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} onLanguageChange={setLanguage} />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className={`${showSidebar ? "w-80" : "w-0"} transition-all duration-300 border-r bg-background overflow-hidden`}>
          <div className="w-80 p-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Search & Filters</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSidebar(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <SearchFilters
              filters={uiFilters}
              onFiltersChange={(nf) => handleFiltersChange(nf)}
              municipalities={municipalities || []}
            />

            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">{totalResults} places found</p>
              <Tabs value={view} onValueChange={(v) => setView(v as "map" | "grid")}>
                <TabsList className="w-full">
                  <TabsTrigger value="map" className="flex-1">
                    <Map className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                  <TabsTrigger value="grid" className="flex-1">
                    <Grid className="h-4 w-4 mr-2" />
                    Grid
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 relative">
          <Tabs value={view} className="h-full">
            <TabsContent value="map" className="h-full mt-0">
              <MapView places={safePlaces} onPlaceClick={(p: Place) => setSelectedPlace(p)} className="h-full" />
            </TabsContent>

            <TabsContent value="grid" className="h-full mt-0 overflow-y-auto">
              <div className="p-6">
                {safePlaces.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No places found</h3>
                      <p className="text-muted-foreground mb-4">Try adjusting your search criteria or filters</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {safePlaces.map((place) => (
                      <div key={place.id} onClick={() => handleViewDetails(place)}>
                        <PlaceCard place={place} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Toggle Sidebar */}
          <div className="absolute top-4 left-4 z-[1000]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="bg-white/90 backdrop-blur-sm hover:bg-white"
            >
              <List className="h-4 w-4 mr-2" />
              {showSidebar ? "Hide" : "Show"} Filters
            </Button>
          </div>

          {/* Results Counter */}
          <div className="absolute top-4 right-4 z-[1000]">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-2 px-3">
                <p className="text-sm font-medium">{totalResults} places</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Selected Place Drawer */}
      {selectedPlace && (
        <Sheet open={!!selectedPlace} onOpenChange={() => setSelectedPlace(null)}>
          <SheetContent side="right" className="w-96">
            <SheetHeader>
              <SheetTitle>{selectedPlace.title}</SheetTitle>
              <SheetDescription>
                {selectedPlace.municipality}
                {selectedPlace.suco ? `, ${selectedPlace.suco}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <PlaceCard place={selectedPlace} />
              <div className="mt-4">
                <Button onClick={() => handleViewDetails(selectedPlace)}>Open details</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  )
}
