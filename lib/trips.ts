import type { Place } from "./place" // Assuming Place is imported from another file

export interface TripPlace {
  placeId: string
  place: Place
  order: number
  notes?: string
}

export interface Trip {
  id: string
  name: string
  description?: string
  places: TripPlace[]
  createdAt: Date
  updatedAt: Date
  ownerId: string
  isPublic: boolean
  estimatedDuration?: number // in days
}

const STORAGE_KEY = "harii-timor-trips"

const getStoredTrips = (): Trip[] => {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setStoredTrips = (trips: Trip[]): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  } catch (error) {
    console.error("Failed to save trips to localStorage:", error)
  }
}

export const createTrip = async (tripData: Omit<Trip, "id" | "createdAt" | "updatedAt">): Promise<{ id: string }> => {
  const trips = getStoredTrips()
  const now = new Date()
  const newTrip: Trip = {
    ...tripData,
    id: `trip-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }

  const updatedTrips = [...trips, newTrip]
  setStoredTrips(updatedTrips)

  return { id: newTrip.id }
}

export const updateTrip = async (tripId: string, updates: Partial<Trip>): Promise<void> => {
  const trips = getStoredTrips()
  const updatedTrips = trips.map((trip) => (trip.id === tripId ? { ...trip, ...updates, updatedAt: new Date() } : trip))
  setStoredTrips(updatedTrips)
}

export const deleteTrip = async (tripId: string): Promise<void> => {
  const trips = getStoredTrips()
  const updatedTrips = trips.filter((trip) => trip.id !== tripId)
  setStoredTrips(updatedTrips)
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

export const getPublicTrips = async (): Promise<Trip[]> => {
  const trips = getStoredTrips()
  return trips
    .filter((trip) => trip.isPublic)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// Calculate estimated travel time between two coordinates (in hours)
export const calculateTravelTime = (from: { lat: number; lng: number }, to: { lat: number; lng: number }): number => {
  const distance = calculateDistance(from, to)
  // Assume average speed of 40 km/h on Timor-Leste roads
  return distance / 40
}

// Calculate distance between two coordinates (in km)
export const calculateDistance = (from: { lat: number; lng: number }, to: { lat: number; lng: number }): number => {
  const R = 6371 // Earth's radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const calculateTripStats = (trip: Trip) => {
  if (trip.places.length < 2) {
    return { totalDistance: 0, totalTime: 0, estimatedDays: 1 }
  }

  let totalDistance = 0
  let totalTime = 0

  for (let i = 0; i < trip.places.length - 1; i++) {
    const from = trip.places[i].place.coords
    const to = trip.places[i + 1].place.coords
    totalDistance += calculateDistance(from, to)
    totalTime += calculateTravelTime(from, to)
  }

  // Estimate days based on number of places and travel time
  const estimatedDays = Math.max(1, Math.ceil(trip.places.length / 2 + totalTime / 8))

  return { totalDistance, totalTime, estimatedDays }
}
