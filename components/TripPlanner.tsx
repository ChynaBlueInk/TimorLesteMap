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
import { Plus, X, MapPin, Clock, Route, Save, GripVertical, AlertCircle, Calendar, Car, Pin } from "lucide-react"

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

export default function TripPlanner({ trip, language = "en", onSave, onCancel }: TripPlannerProps) {
  const { t } = useTranslation()

  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<TripPlace[]>(trip?.places || [])
  const [tripName, setTripName] = useState(trip?.name || "")
  const [tripDescription, setTripDescription] = useState(trip?.description || "")
  const [isPublic, setIsPublic] = useState(trip?.isPublic || false)

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
};

const safeCategoryKey = (
  cat: string
):
  | "category.history"
  | "category.culture"
  | "category.nature"
  | "category.food"
  | "category.memorials" => categoryKeyMap[cat] ?? "category.nature";

const filteredPlaces = (availablePlaces ?? []).filter((place) => {
  const q = (searchQuery ?? "").toString().trim().toLowerCase();

  const title = (place.title ?? "").toString().toLowerCase();
  const muni  = (place.municipality ?? "").toString().toLowerCase();

  // if q is empty, treat as a match (i.e., no search filter)
  const matchesSearch =
    q === "" || title.includes(q) || muni.includes(q);

  const catFilter = (categoryFilter ?? "all").toString();
  const placeCat  = (place.category ?? "other").toString();

  const matchesCategory = catFilter === "all" || placeCat === catFilter;

  const notSelected = (selectedPlaces ?? []).every((tp) => tp.placeId !== place.id);

  return matchesSearch && matchesCategory && notSelected;
});

const addPlace = (place: Place) => {
  if (!place.id) return; // guard just in case
  const newTripPlace: TripPlace = {
    placeId: place.id,
    place,
    order: (selectedPlaces ?? []).length,
    notes: "",
  };
  setSelectedPlaces([...(selectedPlaces ?? []), newTripPlace]);
};

const removePlace = (placeId: string) => {
  setSelectedPlaces((selectedPlaces ?? []).filter((tp) => tp.placeId !== placeId));
};

const updatePlaceNotes = (placeId: string, notes: string) => {
  setSelectedPlaces((selectedPlaces ?? []).map((tp) => (tp.placeId === placeId ? { ...tp, notes } : tp)));
};

const handleDragEnd = (result: any) => {
  if (!result?.destination) return;
  const items = Array.from(selectedPlaces ?? []);
  const [reorderedItem] = items.splice(result.source.index, 1);
  items.splice(result.destination.index, 0, reorderedItem);
  setSelectedPlaces(items.map((item, i) => ({ ...item, order: i })));
};


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
            <Input id="tripName" value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="My Timor-Leste Adventure" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tripDescription">Description (Optional)</Label>
            <Textarea id="tripDescription" value={tripDescription} onChange={(e) => setTripDescription(e.target.value)} placeholder="Describe your trip itinerary..." rows={3} />
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
                  <SelectItem value="dili"><div className="flex items-center gap-2"><Pin className="h-4 w-4" />Dili (default)</div></SelectItem>
                  <SelectItem value="none"><div className="flex items-center gap-2"><Pin className="h-4 w-4" />No explicit start</div></SelectItem>
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

      <Tabs defaultValue="places" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="places">Select Places</TabsTrigger>
          <TabsTrigger value="itinerary">Plan Itinerary</TabsTrigger>
        </TabsList>

        <TabsContent value="places" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Available Places</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input className="flex-1" placeholder="Search places..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                    ].map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredPlaces.map((place) => (
                  <Card key={place.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm">{place.title}</h3>
                        <Button size="sm" variant="outline" onClick={() => addPlace(place)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{place.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{t(safeCategoryKey(place.category))}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3 w-3 mr-1" />{place.municipality ?? "Unknown"}</span>
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
            <CardHeader><CardTitle>Your Itinerary ({selectedPlaces.length} places)</CardTitle></CardHeader>
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
                        {selectedPlaces.map((tp, index) => (
                          <Draggable key={tp.placeId} draggableId={tp.placeId} index={index}>
                            {(provided) => (
                              <Card ref={provided.innerRef} {...provided.draggableProps} className="relative">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div {...provided.dragHandleProps} className="flex items-center justify-center w-8 h-8 bg-muted rounded cursor-grab">
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h3 className="font-medium">{tp.place.title}</h3>
                                          <p className="text-sm text-muted-foreground">
                                            {tp.place.municipality ?? "Unknown"} • {t(safeCategoryKey(tp.place.category))}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">Stop {index + 1}</Badge>
                                          <Button size="sm" variant="ghost" onClick={() => removePlace(tp.placeId)}><X className="h-3 w-3" /></Button>
                                        </div>
                                      </div>
                                      <Textarea placeholder="Add notes for this stop..." value={tp.notes || ""} onChange={(e) => updatePlaceNotes(tp.placeId, e.target.value)} rows={2} className="text-sm" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={loading} className="flex-1">
          {loading ? (<><Clock className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="mr-2 h-4 w-4" />{trip ? "Update Trip" : "Save Trip"}</>)}
        </Button>
        {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  )
}
