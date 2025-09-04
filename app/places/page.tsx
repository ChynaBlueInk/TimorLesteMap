"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { getPlaces, type Place } from "@/lib/firestore"
import PlaceCard from "@/components/PlaceCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, MapPin, Filter } from "lucide-react"
import { useTranslation, type Language } from "@/lib/i18n"

type SortKey = "newest" | "oldest" | "az"

export default function PlacesPage() {
  const [language, setLanguage] = useState<Language>("en")
  const { t } = useTranslation(language)

  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // filters
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [municipality, setMunicipality] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("newest")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(undefined)
      try {
        const all = await getPlaces()
        if (!cancelled) setPlaces(all)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load places")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Build lists for filters
  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "history", label: t("category.history") },
    { value: "culture", label: t("category.culture") },
    { value: "nature", label: t("category.nature") },
    { value: "food", label: t("category.food") },
    { value: "memorials", label: t("category.memorials") }, // covers both 'memorial' & 'memorials'
    { value: "other", label: "Other" },
  ]

  const municipalityOptions = useMemo(() => {
    const set = new Set<string>()
    places.forEach((p) => {
      if (p.municipality && p.municipality.trim()) set.add(p.municipality.trim())
    })
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [places])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    const matchesQuery = (p: Place) => {
      if (!q) return true
      return (
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.municipality || "").toLowerCase().includes(q)
      )
    }

    const matchesCategory = (p: Place) => {
      if (category === "all") return true
      if (category === "memorials") return p.category === "memorial" || p.category === "memorials"
      return p.category === (category as Place["category"])
    }

    const matchesMunicipality = (p: Place) => {
      if (municipality === "all") return true
      return (p.municipality || "").trim() === municipality
    }

    let res = places.filter((p) => matchesQuery(p) && matchesCategory(p) && matchesMunicipality(p))

    // sort
    res = [...res].sort((a, b) => {
      if (sort === "newest") return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      if (sort === "oldest") return (a.updatedAt ?? 0) - (b.updatedAt ?? 0)
      // "az"
      return a.title.localeCompare(b.title)
    })

    return res
  }, [places, query, category, municipality, sort])

  const clearFilters = () => {
    setQuery("")
    setCategory("all")
    setMunicipality("all")
    setSort("newest")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("nav.map") || "Places"}</h1>
            <p className="text-muted-foreground">All places currently in the catalogue</p>
          </div>
          <Button asChild>
            <Link href="/submit">Submit a Place</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search by name, description, municipality…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Municipality */}
            <div>
              <Select value={municipality} onValueChange={setMunicipality}>
                <SelectTrigger>
                  <SelectValue placeholder="Municipality" />
                </SelectTrigger>
                <SelectContent>
                  {municipalityOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m === "all" ? "All Municipalities" : m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="md:col-span-1">
              <Select value={sort} onValueChange={(v: SortKey) => setSort(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="az">A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Count + Clear */}
            <div className="md:col-span-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? "place" : "places"}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded mb-3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
              <div className="mt-4">
                <Button onClick={() => location.reload()}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No places match your filters</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters.</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onViewOnMap={(p) => {
                  window.location.href = `/map?place=${p.id}`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
