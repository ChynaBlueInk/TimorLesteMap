"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getPlaces, type Place } from "@/lib/firestore"
import { createTrip, updateTrip, type Trip, type TripPlace, calculateTripStats } from "@/lib/trips"
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
import { Plus, X, MapPin, Clock, Route, Save, GripVertical, AlertCircle, Calendar, Car } from "lucide-react"

interface TripPlannerProps {
  trip?: Trip
  language?: Language
  onSave?: (trip: Trip) => void
  onCancel?: () => void
}

export default function TripPlanner({ trip, language = "en", onSave, onCancel }: TripPlannerProps) {
  const { user } = useAuth()
  const { t } = useTranslation(language)

  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<TripPlace[]>(trip?.places || [])
  const [tripName, setTripName] = useState(trip?.name || "")
  const [tripDescription, setTripDescription] = useState(trip?.description || "")
  const [isPublic, setIsPublic] = useState(trip?.isPublic || false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  useEffect(() => {
    loadPlaces()
  }, [])

  const loadPlaces = async () => {
    try {
      const places = await getPlaces({ status: "published" })
      setAvailablePlaces(places)
    } catch (error) {
      console.error("Error loading places:", error)
    }
  }

  const filteredPlaces = availablePlaces.filter((place) => {
    const matchesSearch =
      place.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.municipality.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || place.category === categoryFilter
    const notSelected = !selectedPlaces.some((tp) => tp.placeId === place.id)

    return matchesSearch && matchesCategory && notSelected
  })

  const addPlace = (place: Place) => {
    const newTripPlace: TripPlace = {
      placeId: place.id!,
      place,
      order: selectedPlaces.length,
      notes: "",
    }
    setSelectedPlaces([...selectedPlaces, newTripPlace])
  }

  const removePlace = (placeId: string) => {
    setSelectedPlaces(selectedPlaces.filter((tp) => tp.placeId !== placeId))
  }

  const updatePlaceNotes = (placeId: string, notes: string) => {
    setSelectedPlaces(selectedPlaces.map((tp) => (tp.placeId === placeId ? { ...tp, notes } : tp)))
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(selectedPlaces)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order numbers
    const reorderedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }))

    setSelectedPlaces(reorderedItems)
  }

  const handleSave = async () => {
    if (!user) {
      setError("You must be signed in to save trips")
      return
    }

    if (!tripName.trim()) {
      setError("Trip name is required")
      return
    }

    if (selectedPlaces.length === 0) {
      setError("Please add at least one place to your trip")
      return
    }

    setLoading(true)
    setError("")

    try {
      const tripData = {
        name: tripName.trim(),
        description: tripDescription.trim(),
        places: selectedPlaces,
        ownerId: user.uid,
        isPublic,
      }

      if (trip?.id) {
        await updateTrip(trip.id, tripData)
        onSave?.({ ...trip, ...tripData, updatedAt: new Date() })
      } else {
        const { id } = await createTrip(tripData)
        const newTrip: Trip = {
          ...tripData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        onSave?.(newTrip)
      }
    } catch (error: any) {
      setError(error.message || "Failed to save trip")
    } finally {
      setLoading(false)
    }
  }

  const tripStats =
    selectedPlaces.length > 0
      ? calculateTripStats({
          id: "",
          name: tripName,
          places: selectedPlaces,
          ownerId: user?.uid || "",
          isPublic,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      : null

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
          {/* Place Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Available Places</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search places..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
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
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{place.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {t(`category.${place.category}`)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {place.municipality}
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

        <TabsContent value="itinerary" className="space-y-4">
          {/* Trip Statistics */}
          {tripStats && (
            <Card>
              <CardHeader>
                <CardTitle>Trip Overview</CardTitle>
              </CardHeader>
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
                      <p className="text-xs text-muted-foreground">Driving Time</p>
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
              </CardContent>
            </Card>
          )}

          {/* Selected Places */}
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
                        {selectedPlaces.map((tripPlace, index) => (
                          <Draggable key={tripPlace.placeId} draggableId={tripPlace.placeId} index={index}>
                            {(provided) => (
                              <Card ref={provided.innerRef} {...provided.draggableProps} className="relative">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="flex items-center justify-center w-8 h-8 bg-muted rounded cursor-grab"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h3 className="font-medium">{tripPlace.place.title}</h3>
                                          <p className="text-sm text-muted-foreground">
                                            {tripPlace.place.municipality} • {t(`category.${tripPlace.place.category}`)}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            Stop {index + 1}
                                          </Badge>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removePlace(tripPlace.placeId)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      <Textarea
                                        placeholder="Add notes for this stop..."
                                        value={tripPlace.notes || ""}
                                        onChange={(e) => updatePlaceNotes(tripPlace.placeId, e.target.value)}
                                        rows={2}
                                        className="text-sm"
                                      />
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
    </div>
  )
}
