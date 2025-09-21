// components/TripPlanner.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { getPlaces, type Place } from "@/lib/firestore"
import {
  createTrip,
  updateTrip,
  type Trip,
  type TripPlace,
  calculateTripStats,
  type TransportMode,
  type RoadCondition,
  type StartKey,
} from "@/lib/trips"
import { useTranslation, type Language } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import TripPhotosUploader, { type TripPhoto } from "@/components/TripPhotosUploader"
import { Plus, X, MapPin, Clock, Route, Save, GripVertical, AlertCircle, Calendar, Car, Pin, Search, Pencil } from "lucide-react"

// --- Map picker (react-leaflet) ---
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import L, { LatLngLiteral, Icon } from "leaflet"

// Leaflet default icon fix (same as MapView)
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

interface TripPlannerProps {
  trip?: Trip
  language?: Language
  onSave?: (trip: Trip) => void
  onCancel?: () => void
}

const START_PRESETS = {
  dili: { label: "Dili (default)", coords: { lat: -8.5586, lng: 125.5736 } },
  none: { label: "No explicit start (begin at first stop)", coords: null as any },
} as const

// Small helper component to capture map clicks
function MapClickCapture({ onPick }: { onPick: (latlng: LatLngLiteral) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function TripPlanner({ trip, language = "en", onSave, onCancel }: TripPlannerProps) {
  const { t } = useTranslation()

  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<TripPlace[]>(trip?.places || [])
  const [tripName, setTripName] = useState(trip?.name || "")
  const [tripDescription, setTripDescription] = useState(trip?.description || "")
  const [isPublic, setIsPublic] = useState(trip?.isPublic || false)

  // Photos state (seed from existing trip if present)
  const [tripPhotos, setTripPhotos] = useState<TripPhoto[]>(trip?.tripPhotos ?? [])

  // Handle photo changes (local state + optional immediate persist)
  const onPhotosChange = (photos: TripPhoto[]) => {
    setTripPhotos(photos)
    if (trip?.id) {
      updateTrip(trip.id, { tripPhotos: photos }).catch(() => {
        // TODO: show a toast/banner on failure
      })
    }
  }

  const [transportMode, setTransportMode] = useState<TransportMode>(trip?.transportMode ?? "car")
  const [roadCondition, setRoadCondition] = useState<RoadCondition>(trip?.roadCondition ?? "mixed")
  const [startKey, setStartKey] = useState<StartKey>(trip?.startKey ?? "dili")

  // custom end
  const [useCustomEnd, setUseCustomEnd] = useState(Boolean(trip?.customEndCoords))
  const [endName, setEndName] = useState(trip?.customEndName ?? "")
  const [endLat, setEndLat] = useState(trip?.customEndCoords?.lat?.toString() ?? "")
  const [endLng, setEndLng] = useState(trip?.customEndCoords?.lng?.toString() ?? "")

  // manual override
  const [useOverride, setUseOverride] = useState(
    typeof trip?.overrideDistanceKm === "number" || typeof trip?.overrideTimeHours === "number"
  )
  const [overrideKm, setOverrideKm] = useState(
    typeof trip?.overrideDistanceKm === "number" ? String(trip?.overrideDistanceKm) : ""
  )
  const [overrideHr, setOverrideHr] = useState(
    typeof trip?.overrideTimeHours === "number" ? String(trip?.overrideTimeHours) : ""
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // New: sub-tabs for "Select Places"
  const [selectTab, setSelectTab] = useState<"list" | "area" | "map">("list")

  // Area search (Nominatim)
  const [areaQuery, setAreaQuery] = useState("")
  const [areaLoading, setAreaLoading] = useState(false)
  const [areaResults, setAreaResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([])
  const [areaErr, setAreaErr] = useState<string | null>(null)

  // Map-pick pending point
  const [pendingPoint, setPendingPoint] = useState<LatLngLiteral | null>(null)
  const [customStopName, setCustomStopName] = useState("")
  // ---- Stop Editor State / Helpers ----
  type StopEditorState = {
    index: number
    placeId: string
    isCustom: boolean
    title: string
    lat?: string
    lng?: string
    notes: string
    replaceSearch: string
    replaceSelectedPlaceId?: string
  } | null

  const [stopEditor, setStopEditor] = useState<StopEditorState>(null)

  const openStopEditor = (index: number) => {
    const tp = selectedPlaces[index]
    const isCustom = tp.place.id?.startsWith("custom-") ?? false
    setStopEditor({
      index,
      placeId: tp.placeId,
      isCustom,
      title: tp.place.title ?? "",
      lat: isCustom ? String(tp.place.coords?.lat ?? "") : undefined,
      lng: isCustom ? String(tp.place.coords?.lng ?? "") : undefined,
      notes: tp.notes ?? "",
      replaceSearch: "",
      replaceSelectedPlaceId: undefined,
    })
  }

  const closeStopEditor = () => setStopEditor(null)


// ---- Insert Stop (between cards) State / Helpers ----
type InsertModalState = {
  index: number // where to insert
  search: string
  mode: "existing" | "custom"
  // for "custom"
  title?: string
  lat?: string
  lng?: string
} | null

const [insertModal, setInsertModal] = useState<InsertModalState>(null)

const openInsertAt = (index: number) => {
  setInsertModal({ index, search: "", mode: "existing", title: "", lat: "", lng: "" })
}
const closeInsert = () => setInsertModal(null)

// small helper to persist places if editing existing trip
const persistPlacesIfNeeded = async (next: TripPlace[]) => {
  setSelectedPlaces(next)
  if (trip?.id) {
    try {
      await updateTrip(trip.id, { places: next })
    } catch (e) {
      console.error("Failed to persist places", e)
    }
  }
}

const insertPlaceAt = async (index: number, place: Place) => {
  if (!place?.id) return
  const next = [...(selectedPlaces ?? [])]
  const newItem: TripPlace = {
    placeId: place.id,
    place,
    order: index,
    notes: "",
  }
  next.splice(index, 0, newItem)
  const normalized = next.map((p, i) => ({ ...p, order: i }))
  await persistPlacesIfNeeded(normalized)
  closeInsert()
}

const addCustomStopAt = async (index: number, coords: { lat: number; lng: number }, name?: string) => {
  const title =
    (name ?? "").trim() ||
    `Custom Stop (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`

  const customPlace: Place = {
    id: `custom-${Date.now()}`,
    title,
    description: "",
    category: "other" as any,
    municipality: "",
    suco: "",
    coords: { lat: coords.lat, lng: coords.lng },
    images: [],
    sources: [],
    languages: [],
    period: {},
    ownerId: "anonymous",
    status: "published",
    featured: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await insertPlaceAt(index, customPlace)
}

// Candidates for "existing place" picker
const insertCandidates = useMemo(() => {
  if (!insertModal) return []
  const q = insertModal.search.trim().toLowerCase()
  const base = (availablePlaces ?? [])
  if (!q) return base.slice(0, 20)
  return base
    .filter((p) =>
      (p.title ?? "").toLowerCase().includes(q) ||
      (p.municipality ?? "").toLowerCase().includes(q)
    )
    .slice(0, 20)
}, [insertModal, availablePlaces])


// REPLACE your applyStopEdit with this async version
const applyStopEdit = async () => {
  if (!stopEditor) return
  const { index, isCustom, title, lat, lng, notes, replaceSelectedPlaceId } = stopEditor

  // Build the next places array from current state
  const next = (() => {
    const copy = [...selectedPlaces]
    const current = copy[index]
    if (!current) return selectedPlaces

    if (replaceSelectedPlaceId) {
      // Replace with another existing Place
      const newPlace = availablePlaces.find((p) => p.id === replaceSelectedPlaceId)
      if (newPlace) {
        copy[index] = {
          ...current,
          placeId: newPlace.id as string,
          place: newPlace,
        }
      }
    } else if (isCustom) {
      // Edit a custom pin's title/coords
      const latNum =
        lat && lat.trim() !== "" && !Number.isNaN(Number(lat)) ? Number(lat) : current.place.coords?.lat
      const lngNum =
        lng && lng.trim() !== "" && !Number.isNaN(Number(lng)) ? Number(lng) : current.place.coords?.lng
      copy[index] = {
        ...current,
        place: {
          ...current.place,
          title: title || current.place.title,
          coords: { lat: latNum as number, lng: lngNum as number },
          updatedAt: Date.now(),
        },
      }
    }

    // Always update notes
    copy[index] = { ...copy[index], notes }
    // Normalize order just in case
    return copy.map((p, i) => ({ ...p, order: i }))
  })()

  // Optimistic UI
  setSelectedPlaces(next)

  // Persist if editing an existing trip
  if (trip?.id) {
    try {
      await updateTrip(trip.id, { places: next })
    } catch (e) {
      // optional: surface error UI
      console.error("Failed to persist stop edit", e)
    }
  }

  closeStopEditor()
}

const replaceCandidates = useMemo(() => {
  if (!stopEditor) return []
  const q = stopEditor.replaceSearch.trim().toLowerCase()
  return (availablePlaces ?? [])
    .filter((p) => p.id !== stopEditor.placeId) // exclude current
    .filter((p) => !q || (p.title ?? "").toLowerCase().includes(q) || (p.municipality ?? "").toLowerCase().includes(q))
    .slice(0, 12)
}, [stopEditor, availablePlaces])

  useEffect(() => {
    ;(async () => {
      try {
        const places = await getPlaces({ status: "published" })
        setAvailablePlaces(places)
      } catch (e) {
        console.error("Error loading places:", e)
      }
    })()
  }, [])

  // category translation map
  const categoryKeyMap: Record<
    string,
    | "category.history"
    | "category.culture"
    | "category.nature"
    | "category.food"
    | "category.memorials"
  > = {
    history: "category.history",
    culture: "category.culture",
    nature: "category.nature",
    food: "category.food",
    memorials: "category.memorials",
  }

  const safeCategoryKey = (
    cat: string
  ):
    | "category.history"
    | "category.culture"
    | "category.nature"
    | "category.food"
    | "category.memorials" => categoryKeyMap[cat] ?? "category.nature"

  const filteredPlaces = (availablePlaces ?? []).filter((place) => {
    const q = (searchQuery ?? "").toString().trim().toLowerCase()

    const title = (place.title ?? "").toString().toLowerCase()
    const muni = (place.municipality ?? "").toString().toLowerCase()

    const matchesSearch = q === "" || title.includes(q) || muni.includes(q)

    const catFilter = (categoryFilter ?? "all").toString()
    const placeCat = (place.category ?? "other").toString()

    const matchesCategory = catFilter === "all" || placeCat === catFilter

    const notSelected = (selectedPlaces ?? []).every((tp) => tp.placeId !== place.id)

    return matchesSearch && matchesCategory && notSelected
  })

  const addPlace = (place: Place) => {
    if (!place.id) return
    const newTripPlace: TripPlace = {
      placeId: place.id,
      place,
      order: (selectedPlaces ?? []).length,
      notes: "",
    }
    setSelectedPlaces([...(selectedPlaces ?? []), newTripPlace])
  }
  const updatePlaceNotes = (placeId: string, notes: string) => {
  setSelectedPlaces((prev) =>
    (prev ?? []).map((tp) => (tp.placeId === placeId ? { ...tp, notes } : tp))
  )
}


  // REPLACE your removePlace with this async version
const removePlace = async (placeId: string) => {
  const next = (selectedPlaces ?? [])
    .filter((tp) => tp.placeId !== placeId)
    .map((p, i) => ({ ...p, order: i }))

  // Optimistic UI
  setSelectedPlaces(next)

  if (trip?.id) {
    try {
      await updateTrip(trip.id, { places: next })
    } catch (e) {
      console.error("Failed to persist stop delete", e)
    }
  }
}
// Reorder + persist
const handleDragEnd = async (result: any) => {
  if (!result?.destination) return
  const items = Array.from(selectedPlaces ?? [])
  const [moved] = items.splice(result.source.index, 1)
  items.splice(result.destination.index, 0, moved)
  const next = items.map((item, i) => ({ ...item, order: i }))

  // Optimistic UI
  setSelectedPlaces(next)

  // Persist if this is an existing trip
  if (trip?.id) {
    try {
      await updateTrip(trip.id, { places: next })
    } catch (e) {
      console.error("Failed to persist reorder", e)
    }
  }
}

  // Add a custom stop from coords (+ optional name)
  const addCustomStop = (coords: LatLngLiteral, name?: string) => {
    const title =
      (name ?? "").trim() ||
      `Custom Stop (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`

    const customPlace: Place = {
      // Minimal viable Place for trip use
      id: `custom-${Date.now()}`,
      title,
      description: "",
      category: "other" as any,
      municipality: "",
      suco: "",
      coords: { lat: coords.lat, lng: coords.lng },
      images: [],
      sources: [],
      languages: [],
      period: {},
      ownerId: "anonymous",
      status: "published",
      featured: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    addPlace(customPlace)
  }

  // Area search via Nominatim (client-side)
  const handleAreaSearch = async () => {
    const q = areaQuery.trim()
    if (!q) {
      setAreaResults([])
      setAreaErr(null)
      return
    }
    setAreaLoading(true)
    setAreaErr(null)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(
        q
      )}`
      const res = await fetch(url, {
        headers: {
          // Some Nominatim instances rate-limit; Referer header is automatically set by browser
          // We can't set User-Agent in browser; this is fine for light usage.
        },
      })
      if (!res.ok) throw new Error(`Search failed ${res.status}`)
      const data = (await res.json()) as { display_name: string; lat: string; lon: string }[]
      setAreaResults(data)
    } catch (e: any) {
      setAreaErr(e?.message || "Search failed")
      setAreaResults([])
    } finally {
      setAreaLoading(false)
    }
  }

  // build a Trip-like object to compute stats
  const statsTrip: Trip | null =
    selectedPlaces.length > 0
      ? {
          id: "",
          name: tripName || "Untitled Trip",
          description: tripDescription,
          places: selectedPlaces,
          ownerId: "anonymous",
          isPublic,
          transportMode,
          roadCondition,
          startKey,
          customEndName: endName || undefined,
          customEndCoords:
            endLat && endLng && !isNaN(parseFloat(endLat)) && !isNaN(parseFloat(endLng))
              ? { lat: parseFloat(endLat), lng: parseFloat(endLng) }
              : undefined,
          overrideDistanceKm: useOverride && overrideKm !== "" ? parseFloat(overrideKm) : undefined,
          overrideTimeHours: useOverride && overrideHr !== "" ? parseFloat(overrideHr) : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : null

  const startCoords = useMemo(() => {
    if (!statsTrip) return undefined
    return statsTrip.startKey === "none" ? undefined : START_PRESETS.dili.coords
  }, [statsTrip])

  const endCoords = statsTrip?.customEndCoords

  const tripStats = useMemo(() => {
    if (!statsTrip) return null
    return calculateTripStats(statsTrip, { startCoords, endCoords })
  }, [statsTrip, startCoords, endCoords])

  const handleSave = async () => {
    if (!tripName.trim()) {
      setError("Trip name is required")
      return
    }
    if (selectedPlaces.length === 0) {
      setError("Please add at least one place to your trip")
      return
    }
    // validate override numeric inputs
    if (useOverride) {
      if (overrideKm !== "" && isNaN(parseFloat(overrideKm))) {
        setError("Override distance must be a number")
        return
      }
      if (overrideHr !== "" && isNaN(parseFloat(overrideHr))) {
        setError("Override time must be a number")
        return
      }
    }

    setLoading(true)
    setError("")
    try {
      const payload: Omit<Trip, "id" | "createdAt" | "updatedAt"> = {
        name: tripName.trim(),
        description: tripDescription.trim(),
        places: selectedPlaces,
        ownerId: "anonymous",
        isPublic,
        transportMode,
        roadCondition,
        startKey,
        customEndName: endName || undefined,
        customEndCoords:
          endLat && endLng && !isNaN(parseFloat(endLat)) && !isNaN(parseFloat(endLng))
            ? { lat: parseFloat(endLat), lng: parseFloat(endLng) }
            : undefined,
        overrideDistanceKm: useOverride && overrideKm !== "" ? parseFloat(overrideKm) : undefined,
        overrideTimeHours: useOverride && overrideHr !== "" ? parseFloat(overrideHr) : undefined,
      }

      if (trip?.id) {
        await updateTrip(trip.id, payload)
        onSave?.({ ...trip, ...payload, updatedAt: new Date() })
      } else {
        const { id } = await createTrip(payload)
        onSave?.({
          ...payload,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save trip")
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "history", label: t("category.history") },
    { value: "culture", label: t("category.culture") },
    { value: "nature", label: t("category.nature") },
    { value: "food", label: t("category.food") },
    { value: "memorials", label: t("category.memorials") },
  ]
return (
  <div className="space-y-6">
    {/* Error banner */}
    {error && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}

    {/* Trip Details */}
    <Card>
      <CardHeader>
        <CardTitle>Trip Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tripName">Trip Name *</Label>
          <Input
            id="tripName"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="My Timor-Leste Adventure"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tripDescription">Description (Optional)</Label>
          <Textarea
            id="tripDescription"
            value={tripDescription}
            onChange={(e) => setTripDescription(e.target.value)}
            placeholder="Describe your trip itinerary..."
            rows={3}
          />
        </div>

        {/* Trip Photos */}
        <div className="space-y-2">
          <Label>Photos (optional)</Label>
          <TripPhotosUploader
            value={tripPhotos}
            onChange={onPhotosChange}
          />
        </div>

        {/* Mode, Road, Start */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Mode of Transport</Label>
            <Select value={transportMode} onValueChange={(v) => setTransportMode(v as TransportMode)}>
              <SelectTrigger><SelectValue placeholder="Choose mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorbike">Motorbike</SelectItem>
                <SelectItem value="scooter">Scooter</SelectItem>
                <SelectItem value="bus">Bus/Minibus</SelectItem>
                <SelectItem value="bicycle">Bicycle</SelectItem>
                <SelectItem value="walking">Walking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Road Conditions</Label>
            <Select value={roadCondition} onValueChange={(v) => setRoadCondition(v as RoadCondition)}>
              <SelectTrigger><SelectValue placeholder="Choose condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sealed">Mostly sealed</SelectItem>
                <SelectItem value="mixed">Mixed / some rough</SelectItem>
                <SelectItem value="rough">Rough / mountainous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start location</Label>
            <Select value={startKey} onValueChange={(v) => setStartKey(v as StartKey)}>
              <SelectTrigger><SelectValue placeholder="Select start" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dili">
                  <div className="flex items-center gap-2"><Pin className="h-4 w-4" />Dili (default)</div>
                </SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2"><Pin className="h-4 w-4" />No explicit start</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom end + Overrides */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Custom end */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="useCustomEnd" checked={useCustomEnd} onCheckedChange={(v) => setUseCustomEnd(Boolean(v))} />
              <Label htmlFor="useCustomEnd">Add custom final destination</Label>
            </div>
            {useCustomEnd && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-3">
                  <Label htmlFor="endName">Name/Label</Label>
                  <Input id="endName" value={endName} onChange={(e) => setEndName(e.target.value)} placeholder="e.g., Maubisse Guesthouse" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endLat">Latitude</Label>
                  <Input id="endLat" value={endLat} onChange={(e) => setEndLat(e.target.value)} placeholder="-8.84" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endLng">Longitude</Label>
                  <Input id="endLng" value={endLng} onChange={(e) => setEndLng(e.target.value)} placeholder="125.60" />
                </div>
              </div>
            )}
          </div>

          {/* Manual overrides */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="useOverride" checked={useOverride} onCheckedChange={(v) => setUseOverride(Boolean(v))} />
              <Label htmlFor="useOverride">Override totals</Label>
            </div>
            {useOverride && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="overrideKm">Total distance (km)</Label>
                  <Input id="overrideKm" inputMode="decimal" value={overrideKm} onChange={(e) => setOverrideKm(e.target.value)} placeholder="e.g., 75" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overrideHr">Travel time (hours)</Label>
                  <Input id="overrideHr" inputMode="decimal" value={overrideHr} onChange={(e) => setOverrideHr(e.target.value)} placeholder="e.g., 2.2" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked as boolean)} />
          <Label htmlFor="isPublic">Make this trip public (others can view and copy)</Label>
        </div>
      </CardContent>
    </Card>

    {/* Main tabs: Select Places / Itinerary */}
    <Tabs defaultValue="places" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="places">Select Places</TabsTrigger>
        <TabsTrigger value="itinerary">Plan Itinerary</TabsTrigger>
      </TabsList>

     {/* -------------------- SELECT PLACES TAB -------------------- */}
      <TabsContent value="places" className="space-y-4">
        {/* Sub-tabs: list / area / map */}
        <Tabs value={selectTab} onValueChange={(v) => setSelectTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Browse List</TabsTrigger>
            <TabsTrigger value="area">Search Area</TabsTrigger>
            <TabsTrigger value="map">Pick on Map</TabsTrigger>
          </TabsList>

          {/* List mode */}
          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Available Places</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    className="flex-1"
                    placeholder="Search places..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "all", label: "All Categories" },
                        { value: "history", label: t("category.history") },
                        { value: "culture", label: t("category.culture") },
                        { value: "nature", label: t("category.nature") },
                        { value: "food", label: t("category.food") },
                        { value: "memorials", label: t("category.memorials") },
                      ].map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredPlaces.map((place) => (
                    <Card key={place.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-sm">{place.title}</h3>
                          <Button size="sm" variant="outline" onClick={() => addPlace(place)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {place.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {t(safeCategoryKey(place.category))}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {place.municipality ?? "Unknown"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredPlaces.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No places found matching your criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Area search */}
          <TabsContent value="area" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Search an Area</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="e.g., Maubisse, Baucau, beach near Dili…"
                      value={areaQuery}
                      onChange={(e) => setAreaQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAreaSearch()}
                    />
                  </div>
                  <Button onClick={handleAreaSearch} disabled={areaLoading}>
                    {areaLoading ? "Searching…" : "Search"}
                  </Button>
                </div>

                {areaErr ? <p className="text-sm text-destructive">{areaErr}</p> : null}

                <div className="grid gap-3">
                  {areaResults.map((r, idx) => {
                    const lat = parseFloat(r.lat)
                    const lng = parseFloat(r.lon)
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
                    return (
                      <Card key={idx}>
                        <CardContent className="p-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{r.display_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {lat.toFixed(4)}, {lng.toFixed(4)}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => addCustomStop({ lat, lng }, r.display_name)}>
                            Add
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                  {!areaLoading && areaResults.length === 0 && areaQuery.trim() !== "" && (
                    <p className="text-sm text-muted-foreground">No results.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map pick */}
          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Pick on Map</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[360px] rounded overflow-hidden">
                  <MapContainer
                    center={{ lat: -8.5586, lng: 125.5736 }}
                    zoom={8}
                    className="h-full w-full"
                    attributionControl={false}
                    zoomControl={true}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickCapture
                      onPick={(ll) => {
                        setPendingPoint(ll)
                        setCustomStopName("")
                      }}
                    />
                    {pendingPoint && <Marker position={pendingPoint} />}
                  </MapContainer>
                </div>

                {pendingPoint && (
                  <div className="grid gap-3 md:grid-cols-3 items-end">
                    <div className="md:col-span-2">
                      <Label htmlFor="customStopName">Name/Label</Label>
                      <Input
                        id="customStopName"
                        placeholder="e.g., Scenic lookout"
                        value={customStopName}
                        onChange={(e) => setCustomStopName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {pendingPoint.lat.toFixed(4)}, {pendingPoint.lng.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => {
                          addCustomStop(pendingPoint, customStopName)
                          setPendingPoint(null)
                          setCustomStopName("")
                        }}
                      >
                        Add Stop
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPendingPoint(null)
                          setCustomStopName("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TabsContent>

  {/* -------------------- ITINERARY TAB -------------------- */}
      <TabsContent value="itinerary" className="space-y-4">
        {tripStats && (
          <Card>
            <CardHeader><CardTitle>Trip Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{Math.round(tripStats.totalDistance)} km</p>
                    <p className="text-xs text-muted-foreground">Total Distance</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{Math.round(tripStats.totalTime)} hours</p>
                    <p className="text-xs text-muted-foreground">Travel Time</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{tripStats.estimatedDays} days</p>
                    <p className="text-xs text-muted-foreground">Recommended Duration</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Start: <span className="font-medium">{startKey === "none" ? "First stop" : "Dili"}</span>
                {endCoords && endName ? <> • End: <span className="font-medium">{endName}</span></> : null}
                {" "}• Mode: <span className="font-medium capitalize">{transportMode}</span>
                {" "}• Roads: <span className="font-medium capitalize">{roadCondition}</span>
                {useOverride ? <> • (Using overrides)</> : null}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Itinerary builder */}
        <Card>
          <CardHeader>
            <CardTitle>Your Itinerary ({selectedPlaces.length} places)</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPlaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No places added yet</p>
                <p className="text-sm">Switch to "Select Places" tab to add destinations</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="trip-places">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {/* Add at start */}
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInsertAt(0)}
                          className="border-dashed"
                          title="Insert a stop at the very beginning"
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" />
                          Add stop at start
                        </Button>
                      </div>

                      {selectedPlaces.map((tp, index) => (
                        <div key={tp.placeId}>
                          <Draggable draggableId={tp.placeId} index={index}>
                            {(provided) => (
                              <Card ref={provided.innerRef} {...provided.draggableProps} className="relative">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="flex items-center justify-center w-8 h-8 bg-muted rounded cursor-grab"
                                      title="Drag to reorder"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h3 className="font-medium">
                                            {tp.place.title}
                                            {tp.place.id?.startsWith("custom-") && (
                                              <span className="ml-2 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700 border border-amber-200">
                                                Custom pin
                                              </span>
                                            )}
                                          </h3>
                                          <p className="text-sm text-muted-foreground">
                                            {tp.place.municipality ?? "Unknown"} • {t(safeCategoryKey(tp.place.category))}
                                          </p>
                                          {tp.place.id?.startsWith("custom-") && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              {tp.place.coords?.lat?.toFixed?.(4)}, {tp.place.coords?.lng?.toFixed?.(4)}
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">Stop {index + 1}</Badge>
                                          <Button size="sm" variant="outline" onClick={() => openStopEditor(index)} title="Edit stop">
                                            <Pencil className="h-3 w-3 mr-1" /> Edit
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => removePlace(tp.placeId)} title="Remove stop">
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      <Textarea
                                        placeholder="Add notes for this stop..."
                                        value={tp.notes || ""}
                                        onChange={(e) => updatePlaceNotes(tp.placeId, e.target.value)}
                                        rows={2}
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>

                          {/* Add between items (after each index) */}
                          <div className="mt-2 flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openInsertAt(index + 1)}
                              className="border-dashed"
                              title="Insert a stop after this position"
                            >
                              <Plus className="mr-2 h-3.5 w-3.5" />
                              Add stop here
                            </Button>
                          </div>
                        </div>
                      ))}

                      {provided.placeholder}

                      {/* Add at end (explicit) */}
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInsertAt(selectedPlaces.length)}
                          className="border-dashed"
                          title="Insert a stop at the very end"
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" />
                          Add stop at end
                        </Button>
                      </div>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Insert Stop Modal */}
    {insertModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">
              Insert stop at position {insertModal.index + 1}
            </h3>
            <Button variant="ghost" size="sm" onClick={closeInsert}>Close</Button>
          </div>

          <div className="p-4 space-y-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={insertModal.mode === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => setInsertModal(m => m ? { ...m, mode: "existing" } : m)}
              >
                Choose existing place
              </Button>
              <Button
                type="button"
                variant={insertModal.mode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setInsertModal(m => m ? { ...m, mode: "custom" } : m)}
              >
                Add custom pin
              </Button>
            </div>

            {/* Existing place picker */}
            {insertModal.mode === "existing" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search places by name..."
                    value={insertModal.search}
                    onChange={(e) =>
                      setInsertModal(m => m ? { ...m, search: e.target.value } : m)
                    }
                  />
                </div>
                <div className="max-h-72 overflow-y-auto rounded border">
                  {availablePlaces
                    .filter(p =>
                      insertModal.search.trim() === "" ||
                      p.title.toLowerCase().includes(insertModal.search.toLowerCase())
                    )
                    .slice(0, 100)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-muted/40"
                      >
                        <div>
                          <p className="text-sm font-medium">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {(p.municipality ?? "Unknown")} • {t(safeCategoryKey(p.category))}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => insertPlaceAt(insertModal.index, p)}
                          title="Insert this place at the selected position"
                        >
                          Insert
                        </Button>
                      </div>
                    ))}
                  {availablePlaces.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">
                      No places loaded yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom pin form */}
            {insertModal.mode === "custom" && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-3 space-y-1">
                  <Label htmlFor="insTitle">Name/Label</Label>
                  <Input
                    id="insTitle"
                    value={insertModal.title}
                    onChange={(e) =>
                      setInsertModal(m => m ? { ...m, title: e.target.value } : m)
                    }
                    placeholder="e.g., Scenic lookout"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="insLat">Latitude</Label>
                  <Input
                    id="insLat"
                    value={insertModal.lat}
                    onChange={(e) =>
                      setInsertModal(m => m ? { ...m, lat: e.target.value } : m)
                    }
                    placeholder="-8.5586"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="insLng">Longitude</Label>
                  <Input
                    id="insLng"
                    value={insertModal.lng}
                    onChange={(e) =>
                      setInsertModal(m => m ? { ...m, lng: e.target.value } : m)
                    }
                    placeholder="125.5736"
                    inputMode="decimal"
                  />
                </div>
                <div className="md:col-span-3">
                  <Button
                    onClick={() => {
                      const lat = Number(insertModal.lat)
                      const lng = Number(insertModal.lng)
                      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
                      addCustomStopAt(insertModal.index, { lat, lng }, insertModal.title)
                    }}
                    disabled={
                      !insertModal.lat || !insertModal.lng ||
                      !Number.isFinite(Number(insertModal.lat)) ||
                      !Number.isFinite(Number(insertModal.lng))
                    }
                  >
                    Insert custom stop
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Actions */}
    <div className="flex gap-4">
      <Button onClick={handleSave} disabled={loading} className="flex-1">
        {loading ? (
          <>
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {trip ? "Update Trip" : "Save Trip"}
          </>
        )}
      </Button>
      {onCancel && (
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>

    {/* ---- Stop Editor Modal ---- */}
    {stopEditor && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Edit Stop {stopEditor!.index + 1}</h2>
            <button onClick={closeStopEditor} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* LEFT: Notes */}
            <div>
              <Label className="mb-1 block">Notes</Label>
              <Textarea
                rows={6}
                value={stopEditor!.notes}
                onChange={(e) => setStopEditor((s) => (s ? { ...s, notes: e.target.value } : s))}
                placeholder="parking, entry fee, timing tips…"
              />
              <p className="mt-2 text-xs text-muted-foreground">Notes save to this stop only.</p>
            </div>

            {/* RIGHT: Replace or Edit Custom */}
            <div>
              {stopEditor!.isCustom ? (
                <>
                  <div className="space-y-2">
                    <Label className="block">Custom title</Label>
                    <Input
                      value={stopEditor!.title}
                      onChange={(e) => setStopEditor((s) => (s ? { ...s, title: e.target.value } : s))}
                      placeholder="e.g., Scenic lookout"
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label>Latitude</Label>
                      <Input
                        inputMode="decimal"
                        value={stopEditor!.lat ?? ""}
                        onChange={(e) => setStopEditor((s) => (s ? { ...s, lat: e.target.value } : s))}
                        placeholder="-8.5586"
                      />
                    </div>
                    <div>
                      <Label>Longitude</Label>
                      <Input
                        inputMode="decimal"
                        value={stopEditor!.lng ?? ""}
                        onChange={(e) => setStopEditor((s) => (s ? { ...s, lng: e.target.value } : s))}
                        placeholder="125.5736"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    These update the pinned location for this custom stop.
                  </p>
                </>
              ) : (
                <>
                  <Label className="block mb-2">Replace with another place</Label>
                  <Input
                    className="flex-1"
                    placeholder="Search places…"
                    value={stopEditor!.replaceSearch}
                    onChange={(e) => setStopEditor((s) => (s ? { ...s, replaceSearch: e.target.value } : s))}
                  />
                  <div className="mt-3 max-h-52 overflow-y-auto rounded border">
                    {replaceCandidates.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No results.</div>
                    ) : (
                      replaceCandidates.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setStopEditor((s) => (s ? { ...s, replaceSelectedPlaceId: p.id as string } : s))}
                          className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-muted ${
                            stopEditor!.replaceSelectedPlaceId === p.id ? "bg-muted" : ""
                          }`}
                        >
                          <div className="font-medium text-sm">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.municipality ?? "Unknown"} • {t(safeCategoryKey(p.category))}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This will replace the current stop’s location.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={closeStopEditor}>Cancel</Button>
            <Button onClick={applyStopEdit}>Apply</Button>
          </div>
        </div>
      </div>
    )}

    {/* ---- Insert Stop Modal ---- */}
    {insertModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add stop at position {insertModal!.index + 1}</h2>
            <button onClick={closeInsert} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            <Button
              variant={insertModal!.mode === "existing" ? "default" : "outline"}
              size="sm"
              onClick={() => setInsertModal((s) => (s ? { ...s, mode: "existing" } : s))}
            >
              Pick existing place
            </Button>
            <Button
              variant={insertModal!.mode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setInsertModal((s) => (s ? { ...s, mode: "custom" } : s))}
            >
              Add custom pin
            </Button>
          </div>

          {insertModal!.mode === "existing" ? (
            <div className="space-y-3">
              <Label className="block">Search places</Label>
              <Input
                placeholder="e.g., Maubisse, Baucau…"
                value={insertModal!.search}
                onChange={(e) => setInsertModal((s) => (s ? { ...s, search: e.target.value } : s))}
              />
              <div className="max-h-72 overflow-y-auto rounded border">
                {insertCandidates.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No results.</div>
                ) : (
                  insertCandidates.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => insertPlaceAt(insertModal!.index, p)}
                      className="block w-full border-b p-3 text-left hover:bg-muted last:border-b-0"
                    >
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.municipality ?? "Unknown"} • {t(safeCategoryKey(p.category))}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="block">Title/Label</Label>
                <Input
                  placeholder="e.g., Scenic lookout"
                  value={insertModal!.title ?? ""}
                  onChange={(e) => setInsertModal((s) => (s ? { ...s, title: e.target.value } : s))}
                />
              </div>
              <div>
                <Label>Latitude</Label>
                <Input
                  inputMode="decimal"
                  placeholder="-8.5586"
                  value={insertModal!.lat ?? ""}
                  onChange={(e) => setInsertModal((s) => (s ? { ...s, lat: e.target.value } : s))}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  inputMode="decimal"
                  placeholder="125.5736"
                  value={insertModal!.lng ?? ""}
                  onChange={(e) => setInsertModal((s) => (s ? { ...s, lng: e.target.value } : s))}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={() => {
                    const lat = Number(insertModal!.lat)
                    const lng = Number(insertModal!.lng)
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
                    addCustomStopAt(insertModal!.index, { lat, lng }, insertModal!.title)
                  }}
                >
                  Add custom stop
                </Button>
              </div>
              <p className="md:col-span-2 text-xs text-muted-foreground">
                Tip: You can also add custom pins from the “Select Places → Pick on Map”
                tab to append at the end, then drag to reorder.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={closeInsert}>
              Close
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
);   // closes return
}   
