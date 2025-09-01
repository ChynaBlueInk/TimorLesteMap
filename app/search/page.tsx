// app/search/page.tsx
"use client"

export const dynamic = "force-dynamic"
export const revalidate = 0

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import nextDynamic from "next/dynamic"
import Navigation from "@/components/Navigation"
import SearchFilters, { type SearchFilters as UIFilters } from "@/components/SearchFilters"
import { useSearch } from "@/hooks/useSearch"
import PlaceCard from "@/components/PlaceCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Map, Grid, Search as SearchIcon } from "lucide-react"
import type { Place } from "@/lib/firestore"
import { useTranslation, type Language } from "@/lib/i18n"

// Load MapView only on the client (prevents SSR/window issues)
const MapView = nextDynamic(() => import("@/components/MapView"), { ssr: false })

// ----- Sort types: UI vs Internal (hook) -----
type UISort = "relevance" | "newest" | "oldest" | "alphabetical"
type InternalSort = "relevance" | "newest" | "oldest" | "title"

// Convert UI <-> Internal
const uiToInternalSort = (s: UISort): InternalSort =>
  s === "alphabetical" ? "title" : s

const internalToUiSort = (s: InternalSort): UISort =>
  s === "title" ? "alphabetical" : s

// Hook expects "title" (internal)
type InternalFilters = Omit<UIFilters, "sortBy"> & { sortBy: InternalSort }

const initialInternalFilters: InternalFilters = {
  query: "",
  categories: [],
  municipalities: [],
  featured: false,
  hasImages: false,
  yearRange: [1500, 2024],
  sortBy: "relevance",
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [view, setView] = useState<"grid" | "map">("grid")

  // language & nav
  const [language, setLanguage] = useState<Language>("en")
  const { t } = useTranslation(language)

  // Read initial values from URL (normalize category plural)
  const urlQuery = searchParams.get("q") || ""
  const urlCategories = (searchParams.get("categories") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((c) => (c === "memorials" ? "memorial" : c))

  // keep **internal** filters for the hook
  const [filters, setFilters] = useState<InternalFilters>(() => ({
    ...initialInternalFilters,
    query: urlQuery,
    categories: urlCategories,
  }))

  // run search with **internal** filters
  const { places, municipalities, loading, error, totalResults } = useSearch(filters)

  // Build **UI** filters for the <SearchFilters /> props
  const uiFilters: UIFilters = {
    ...filters,
    sortBy: filters.sortBy,
  }

  // Receive **UI** filters back, convert to **internal**, update state + URL
  const handleFiltersChange = (newUI: UIFilters) => {
    const nextInternal: InternalFilters = {
      ...newUI,
      sortBy: uiToInternalSort(newUI.sortBy as UISort),
      categories: (newUI.categories || []).map((c) => (c === "memorials" ? "memorial" : c)),
    }

    setFilters(nextInternal)

    // Update URL params (keep categories UI-friendly)
    const params = new URLSearchParams()
    if (newUI.query) params.set("q", newUI.query)
    if (Array.isArray(newUI.categories) && newUI.categories.length > 0) {
      const uiCats = newUI.categories.map((c) => (c === "memorial" ? "memorials" : c))
      params.set("categories", uiCats.join(","))
    }
    // If you later want to sync sort: params.set("sortBy", newUI.sortBy)

    router.replace(params.toString() ? `/search?${params}` : "/search", { scroll: false })
  }

  const handlePlaceClick = (place: Place) => {
    router.push(`/places/${place.id}`)
  }

  if (error) {
    return (
      <>
        <Navigation language={language} onLanguageChange={setLanguage} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Search Error</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} onLanguageChange={setLanguage} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t("nav.search")}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <SearchFilters
                filters={uiFilters}
                onFiltersChange={handleFiltersChange}
                municipalities={municipalities}
              />
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Searching..." : `${totalResults} places found`}
                </p>
              </div>

              <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "map")}>
                <TabsList>
                  <TabsTrigger value="grid" className="flex items-center gap-2">
                    <Grid className="h-4 w-4" />
                    Grid
                  </TabsTrigger>
                  <TabsTrigger value="map" className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Map
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Results Content */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded mb-4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Tabs value={view} className="w-full">
                <TabsContent value="grid" className="mt-0">
                  {places.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No places found</h3>
                        <p className="text-muted-foreground mb-4">
                          Try adjusting your search criteria or filters
                        </p>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleFiltersChange({
                              ...initialInternalFilters,
                              sortBy: internalToUiSort(initialInternalFilters.sortBy),
                            } as UIFilters)
                          }
                        >
                          Clear Filters
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {places.map((place) => (
                        <PlaceCard key={place.id} place={place} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="map" className="mt-0">
                  <div className="h-[600px]">
                    <MapView places={places} onPlaceClick={handlePlaceClick} className="h-full" />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
