// lib/trips.ts
import type { Place } from "./firestore"

export interface TripPlace {
  placeId: string
  place: Place
  order: number
  notes?: string
}

export type TransportMode =
  | "car"
  | "motorbike"
  | "scooter" // NEW: scooter
  | "bus"
  | "bicycle"
  | "walking"

export type RoadCondition = "sealed" | "mixed" | "rough"
export type StartKey = "dili" | "none"

export interface Trip {
  id: string
  name: string
  description?: string
  places: TripPlace[]
  createdAt: Date
  updatedAt: Date
  ownerId: string
  isPublic: boolean

  // Saved planning prefs
  transportMode?: TransportMode
  roadCondition?: RoadCondition
  startKey?: StartKey
  customEndName?: string
  customEndCoords?: { lat: number; lng: number }

  // Optional manual overrides for totals
  overrideDistanceKm?: number
  overrideTimeHours?: number

  estimatedDuration?: number // in days
}

const STORAGE_KEY = "harii-timor-trips"

// ---------- localStorage helpers ----------
const getStoredTrips = (): Trip[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as any[]
    // revive Dates defensively
    return parsed.map((t) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }))
  } catch {
    return []
  }
}

const setStoredTrips = (trips: Trip[]): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  } catch (err) {
    console.error("Failed to save trips to localStorage:", err)
  }
}

// Small internal helper to ensure a trip exists
const getTripStrict = async (tripId: string): Promise<Trip> => {
  const t = await getTrip(tripId)
  if (!t) throw new Error(`Trip not found: ${tripId}`)
  return t
}

// Normalize orders to 0..n-1 and keep array sorted by order
const normalizePlaces = (places: TripPlace[]): TripPlace[] =>
  [...places]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((p, idx) => ({ ...p, order: idx }))

// ---------- API helpers ----------
type ApiTrip = Omit<Trip, "createdAt" | "updatedAt"> & {
  createdAt: number
  updatedAt: number
}

function toApiPayload(trip: Trip): ApiTrip {
  const { createdAt, updatedAt, ...rest } = trip as any
  return {
    ...(rest as Omit<Trip, "createdAt" | "updatedAt">),
    createdAt: trip.createdAt?.getTime?.() ?? Date.now(),
    updatedAt: trip.updatedAt?.getTime?.() ?? Date.now(),
  }
}

async function apiPublishTrip(trip: Trip): Promise<void> {
  if (typeof fetch === "undefined") return
  try {
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiPayload(trip)),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      throw new Error(`POST /api/trips failed: ${res.status} ${txt}`)
    }
  } catch (e) {
    console.warn("Publish trip failed (kept local only):", e)
  }
}

async function apiUpdateTrip(trip: Trip): Promise<void> {
  if (typeof fetch === "undefined") return
  try {
    const res = await fetch(`/api/trips/${encodeURIComponent(trip.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiPayload(trip)),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      throw new Error(`PUT /api/trips/${trip.id} failed: ${res.status} ${txt}`)
    }
  } catch (e) {
    console.warn("Update public trip failed (local still updated):", e)
  }
}

async function apiDeleteTrip(id: string): Promise<void> {
  if (typeof fetch === "undefined") return
  try {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, { method: "DELETE" })
    // 404 is fine (e.g., never published)
    if (!res.ok && res.status !== 404) {
      const txt = await res.text().catch(() => "")
      throw new Error(`DELETE /api/trips/${id} failed: ${res.status} ${txt}`)
    }
  } catch (e) {
    console.warn("Delete public trip failed (local removed):", e)
  }
}

// ---------- Public Trip API (existing) ----------
export const createTrip = async (
  tripData: Omit<Trip, "id" | "createdAt" | "updatedAt">
): Promise<{ id: string }> => {
  const trips = getStoredTrips()
  const now = new Date()
  const newTrip: Trip = {
    ...tripData,
    id: `trip-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  setStoredTrips([...trips, newTrip])

  // if user marked it public, also publish to server
  if (newTrip.isPublic) {
    await apiPublishTrip(newTrip)
  }

  return { id: newTrip.id }
}

export const updateTrip = async (tripId: string, updates: Partial<Trip>): Promise<void> => {
  const trips = getStoredTrips()
  const updatedTrips = trips.map((t) =>
    t.id === tripId ? { ...t, ...updates, updatedAt: new Date() } : t
  )
  setStoredTrips(updatedTrips)

  // If the updated trip is public, sync the latest to server
  const updated = updatedTrips.find((t) => t.id === tripId)
  if (updated?.isPublic) {
    await apiUpdateTrip(updated)
  }
}

export const deleteTrip = async (tripId: string): Promise<void> => {
  const trips = getStoredTrips()
  const trip = trips.find((t) => t.id === tripId)
  setStoredTrips(trips.filter((t) => t.id !== tripId))

  // If it was public, try removing from server too (best effort)
  if (trip?.isPublic) {
    await apiDeleteTrip(tripId)
  }
}

export const getTrip = async (tripId: string): Promise<Trip | null> => {
  const trips = getStoredTrips()
  return trips.find((t) => t.id === tripId) || null
}

export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  const trips = getStoredTrips()
  return trips
    .filter((trip) => trip.ownerId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// Kept for backwards-compat (local-only “public”)
export const getPublicTrips = async (): Promise<Trip[]> => {
  const trips = getStoredTrips()
  return trips
    .filter((trip) => trip.isPublic)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// NEW: simple helper to list all trips (for anonymous/open mode)
export const getAllTrips = async (): Promise<Trip[]> => {
  const trips = getStoredTrips()
  return trips.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// ---------- NEW: Stop-level helpers (edit / insert / delete / reorder) ----------

/**
 * Update a single stop by placeId (notes, place, order, etc).
 * Only the provided fields in `patch` are changed.
 */
export const updateTripPlace = async (
  tripId: string,
  placeId: string,
  patch: Partial<TripPlace>
): Promise<void> => {
  const trip = await getTripStrict(tripId)
  const nextPlaces = trip.places.map((p) => (p.placeId === placeId ? { ...p, ...patch } : p))
  const normalized = normalizePlaces(nextPlaces)
  await updateTrip(tripId, { places: normalized })
}

/**
 * Update a single stop by its array index.
 */
export const updateTripPlaceAt = async (
  tripId: string,
  index: number,
  patch: Partial<TripPlace>
): Promise<void> => {
  const trip = await getTripStrict(tripId)
  if (index < 0 || index >= trip.places.length) throw new Error("index out of range")
  const next = [...trip.places]
  next[index] = { ...next[index], ...patch }
  const normalized = normalizePlaces(next)
  await updateTrip(tripId, { places: normalized })
}

/**
 * Insert a new stop at a specific index (or at the end if index is omitted).
 */
export const insertTripPlace = async (
  tripId: string,
  newPlace: TripPlace,
  index?: number
): Promise<void> => {
  const trip = await getTripStrict(tripId)
  const next = [...trip.places]
  const insertAt = typeof index === "number" ? Math.max(0, Math.min(index, next.length)) : next.length
  next.splice(insertAt, 0, newPlace)
  const normalized = normalizePlaces(next)
  await updateTrip(tripId, { places: normalized })
}

/**
 * Delete a stop by placeId.
 */
export const deleteTripPlace = async (tripId: string, placeId: string): Promise<void> => {
  const trip = await getTripStrict(tripId)
  const filtered = trip.places.filter((p) => p.placeId !== placeId)
  const normalized = normalizePlaces(filtered)
  await updateTrip(tripId, { places: normalized })
}

/**
 * Reorder stops by an array of placeIds specifying the desired order.
 */
export const reorderTripPlaces = async (
  tripId: string,
  newOrderPlaceIds: string[]
): Promise<void> => {
  const trip = await getTripStrict(tripId)
  const byId = new Map(trip.places.map((p) => [p.placeId, p]))
  const reordered: TripPlace[] = []
  // First, place any ids supplied in the specified order
  newOrderPlaceIds.forEach((id, idx) => {
    const found = byId.get(id)
    if (found) reordered.push({ ...found, order: idx })
  })
  // Then, append any remaining (not included) to preserve data
  trip.places.forEach((p) => {
    if (!newOrderPlaceIds.includes(p.placeId)) {
      reordered.push({ ...p, order: reordered.length })
    }
  })
  const normalized = normalizePlaces(reordered)
  await updateTrip(tripId, { places: normalized })
}

/**
 * Swap two stops by their placeIds.
 */
export const swapTripPlaces = async (
  tripId: string,
  aPlaceId: string,
  bPlaceId: string
): Promise<void> => {
  const trip = await getTripStrict(tripId)
  const next = [...trip.places]
  const ai = next.findIndex((p) => p.placeId === aPlaceId)
  const bi = next.findIndex((p) => p.placeId === bPlaceId)
  if (ai < 0 || bi < 0) throw new Error("placeId not found")
  ;[next[ai], next[bi]] = [next[bi], next[ai]]
  const normalized = normalizePlaces(next)
  await updateTrip(tripId, { places: normalized })
}

/**
 * Convenience: set manual distance/time overrides on a trip.
 */
export const setTripOverrides = async (
  tripId: string,
  overrides: {
    overrideDistanceKm?: number
    overrideTimeHours?: number
  }
): Promise<void> => {
  await updateTrip(tripId, overrides)
}

// --- Distance / time helpers ---

// Great-circle distance (km)
export const calculateDistance = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number => {
  const R = 6371
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const MODE_BASE_SPEED: Record<TransportMode, number> = {
  car: 45,
  motorbike: 40,
  scooter: 38, // NEW: scooter (slightly slower than motorbike)
  bus: 35,
  bicycle: 14,
  walking: 4.5,
}

const CONDITION_SPEED_FACTOR: Record<RoadCondition, number> = {
  sealed: 1.0,
  mixed: 0.8,
  rough: 0.6,
}

const CONDITION_ROUTE_FACTOR: Record<RoadCondition, number> = {
  sealed: 1.9,
  mixed: 2.2,
  rough: 2.6,
}

const legStats = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TransportMode,
  condition: RoadCondition
) => {
  const straight = calculateDistance(from, to)
  const distanceKm = straight * CONDITION_ROUTE_FACTOR[condition]
  const speed = MODE_BASE_SPEED[mode] * CONDITION_SPEED_FACTOR[condition]
  const timeHours = speed > 0 ? distanceKm / speed : 0
  return { distanceKm, timeHours }
}

export const calculateTravelTime = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  avgSpeedKph: number = 40
): number => {
  const d = calculateDistance(from, to)
  return d / avgSpeedKph
}

export const calculateTripStats = (
  trip: Trip,
  extras?: {
    startCoords?: { lat: number; lng: number }
    endCoords?: { lat: number; lng: number }
  }
) => {
  const mode: TransportMode = trip.transportMode ?? "car"
  const condition: RoadCondition = trip.roadCondition ?? "mixed"

  // If user provided overrides, honor them (fall back to computed if only one is given)
  if (typeof trip.overrideDistanceKm === "number" || typeof trip.overrideTimeHours === "number") {
    const distance = typeof trip.overrideDistanceKm === "number" ? trip.overrideDistanceKm : 0
    const time = typeof trip.overrideTimeHours === "number" ? trip.overrideTimeHours : 0
    const estimatedDays = Math.max(1, Math.ceil(trip.places.length / 2 + time / 6))
    return { totalDistance: distance, totalTime: time, estimatedDays }
  }

  if (trip.places.length === 0) {
    return { totalDistance: 0, totalTime: 0, estimatedDays: 1 }
  }

  let totalDistance = 0
  let totalTime = 0

  if (extras?.startCoords) {
    const first = trip.places[0].place.coords
    const s = legStats(extras.startCoords, first, mode, condition)
    totalDistance += s.distanceKm
    totalTime += s.timeHours
  }

  for (let i = 0; i < trip.places.length - 1; i++) {
    const from = trip.places[i].place.coords
    const to = trip.places[i + 1].place.coords
    const s = legStats(from, to, mode, condition)
    totalDistance += s.distanceKm
    totalTime += s.timeHours
  }

  if (extras?.endCoords) {
    const last = trip.places[trip.places.length - 1].place.coords
    const s = legStats(last, extras.endCoords, mode, condition)
    totalDistance += s.distanceKm
    totalTime += s.timeHours
  }

  const estimatedDays = Math.max(1, Math.ceil(trip.places.length / 2 + totalTime / 6))
  return { totalDistance, totalTime, estimatedDays }
}
