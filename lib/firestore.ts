// lib/firestore.ts
// Hybrid storage: localStorage for dev; S3 via API routes for prod.
// Flip with NEXT_PUBLIC_STORAGE=s3

export type Place = {
  id: string
  title: string
  description: string
  category: "history" | "culture" | "nature" | "food" | "memorial" | "memorials" | "other"
  municipality?: string
  suco?: string
  coords: { lat: number; lng: number }
  images?: string[]
  sources?: string[]
  languages?: string[]
  createdAt: number
  updatedAt: number
  ownerId?: string
  status?: "published" | "pending" | "flagged"
  featured?: boolean
  period?: { fromYear?: number; toYear?: number }
}

export type UserProfile = {
  uid: string
  displayName?: string
  photoURL?: string
  role?: "user" | "admin"
  createdAt: number
  updatedAt: number
}

export type Report = {
  id: string
  placeId: string
  reporterId?: string
  reason: "inaccurate" | "sensitive" | "duplicate" | "other"
  details?: string
  createdAt: number
  status: "open" | "pending" | "resolved"
}

export type Review = {
  id: string
  placeId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string
  author?: string
  createdAt: number
}

export type GetPlacesFilter = {
  status?: "published" | "pending" | "flagged"
}

const USE_S3 = process.env.NEXT_PUBLIC_STORAGE === "s3"

const PLACES_KEY = "tl_places_v1"
const PROFILE_KEY = "tl_user_profile_v1"
const REPORTS_KEY = "tl_reports_v1"
const REVIEWS_KEY = "tl_reviews_v1"

// ---------- helpers ----------
const isBrowser = () => typeof window !== "undefined"

const readJSON = <T,>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const writeJSON = <T,>(key: string, value: T): void => {
  if (!isBrowser()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

const cryptoRandomId = (): string => {
  const anyCrypto = (globalThis as any).crypto
  if (anyCrypto && typeof anyCrypto.randomUUID === "function") {
    return anyCrypto.randomUUID() as string
  }
  return "id-" + Math.random().toString(36).slice(2, 10)
}

// ---------- Seed data ----------
export const SEED_PLACES: Place[] = [
  {
    id: "cristo-rei-dili",
    title: "Cristo Rei of Dili",
    category: "history",
    municipality: "Díli",
    suco: "Metiaut",
    coords: { lat: -8.5188, lng: 125.605 },
    description: "27-metre Christ the King statue on Cape Fatucama overlooking the Bay of Dili.",
    status: "published",
    featured: true,
    images: [],
    sources: [
      "https://www.timorleste.tl/destinations/popular-locations/",
      "https://en.wikipedia.org/wiki/Cristo_Rei_of_Dili",
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    period: { fromYear: 1996 },
  },
  {
    id: "atauro-island",
    title: "Atauro Island",
    category: "nature",
    municipality: "Díli",
    suco: "Vila Maumeta",
    coords: { lat: -8.236871, lng: 125.576729 },
    description: "Island north of Díli with world-class reefs, hiking and community eco-lodges.",
    status: "published",
    featured: true,
    images: [],
    sources: [
      "https://www.timorleste.tl/destinations/popular-locations/",
      "https://en.wikipedia.org/wiki/Atauro",
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "mount-ramelau-hato-builico",
    title: "Mt Ramelau (Foho Tatamailau) & Hato Builico",
    category: "nature",
    municipality: "Ainaro",
    suco: "Hato Builico",
    coords: { lat: -8.906625, lng: 125.493378 },
    description: "Highest peak in Timor-Leste (2,963 m). Popular sunrise hike from Hato Builico.",
    status: "published",
    featured: true,
    images: [],
    sources: [
      "https://www.timorleste.tl/destinations/popular-locations/",
      "https://www.peakbagger.com/peak.aspx?pid=11013",
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "jaco-island-valu-tutuala",
    title: "Jaco Island & Valu Beach (Tutuala)",
    category: "nature",
    municipality: "Lautém",
    suco: "Tutuala",
    coords: { lat: -8.4217, lng: 127.3217 },
    description: "Sacred uninhabited island at Timor’s far east; crystal-clear waters and sea turtles.",
    status: "published",
    featured: true,
    images: [],
    sources: [
      "https://www.timorleste.tl/destinations/popular-locations/",
      "https://en.wikipedia.org/wiki/Jaco_Island",
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "balibo-fort",
    title: "Balibó & Fort",
    category: "history",
    municipality: "Bobonaro",
    suco: "Balibó",
    coords: { lat: -8.967, lng: 125.033 },
    description: "Historic border town with colonial-era fort and poignant modern history.",
    status: "published",
    images: [],
    sources: [
      "https://www.timorleste.tl/destinations/popular-locations/",
      "https://en.wikipedia.org/wiki/Balibo",
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    period: { fromYear: 1750 },
  },
  {
    id: "baucau-old-town-market",
    title: "Baucau Old Town & Market",
    category: "history",
    municipality: "Baucau",
    suco: "Baucau Vila",
    coords: { lat: -8.46278, lng: 126.45361 },
    description: "Portuguese-era market building and atmospheric old town with coastal views.",
    status: "published",
    images: [],
    sources: [
      "https://www.timorleste.tl/destinations/popular-locations/",
      "https://en.wikipedia.org/wiki/Baucau",
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    period: { fromYear: 1930 },
  },
  {
    id: "maubisse-hill-town",
    title: "Maubisse Hill Town",
    category: "culture",
    municipality: "Ainaro",
    suco: "Maubisse",
    coords: { lat: -8.83806, lng: 125.59722 },
    description: "Cool-climate mountain town; countryside walks and traditional architecture.",
    status: "published",
    images: [],
    sources: [
      "https://www.timorleste.tl/destinations/popular-locations/",
      "https://en.wikipedia.org/wiki/Maubisse",
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "maubara-fort",
    title: "Maubara Fort",
    category: "history",
    municipality: "Liquiçá",
    suco: "Maubara",
    coords: { lat: -8.7523, lng: 125.397 },
    description: "18th-century Dutch coastal fort guarding Maubara Bay.",
    status: "published",
    images: [],
    sources: [
      "https://www.timorleste.tl/destinations/popular-locations/",
      "https://en.wikipedia.org/wiki/Fort_Maubara",
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    period: { fromYear: 1756 },
  },
  {
    id: "cristorei-beach",
    title: "Cristo Rei Beach (Areia Branca)",
    category: "nature",
    municipality: "Díli",
    suco: "Metiaut",
    coords: { lat: -8.525, lng: 125.612 },
    description: "Sheltered white-sand beach below Cape Fatucama; gentle waves and reef for snorkelling.",
    status: "published",
    images: [],
    sources: ["https://en.wikipedia.org/wiki/Cristo_Rei_Beach"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "one-dollar-beach",
    title: "One Dollar Beach",
    category: "nature",
    municipality: "Manatuto",
    suco: "Umakaduak",
    coords: { lat: -8.553, lng: 125.804 },
    description: "Long white-sand beach east of Díli; famously named for the historic parking fee.",
    status: "published",
    images: [],
    sources: ["https://en.wikipedia.org/wiki/One_Dollar_Beach"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

/** Ensure seeds exist and migrate legacy categories. */
const ensureSeeded = (): Place[] => {
  const raw = readJSON<unknown>(PLACES_KEY, undefined as unknown as unknown)
  if (!Array.isArray(raw) || raw.length === 0) {
    writeJSON(PLACES_KEY, SEED_PLACES)
    return [...SEED_PLACES]
  }
  const arr = raw as Place[]
  const valid = ["history", "culture", "nature", "food", "memorial", "memorials", "other"] as const
  const migrated = arr.map((p) => {
    let c = p.category === "memorial" ? "memorials" : p.category
    if (!valid.includes(c as any)) c = "other"
    return { ...p, category: c as Place["category"] }
  })
  if (JSON.stringify(migrated) !== JSON.stringify(arr)) writeJSON(PLACES_KEY, migrated)
  return migrated
}

export const resetPlacesToSeed = (): void => {
  writeJSON(PLACES_KEY, SEED_PLACES)
}

// ============ PLACES (Hybrid) ============
export const getPlaces = async (filter?: GetPlacesFilter): Promise<Place[]> => {
  if (USE_S3) {
    const res = await fetch("/api/places", { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to fetch places")
    let all = (await res.json()) as Place[]
    if (filter?.status) {
      all = all.filter((p) => (p.status ?? "published") === filter.status)
    }
    return all
  }
  const all = ensureSeeded()
  if (!filter) return all
  return filter.status ? all.filter((p) => (p.status ?? "published") === filter.status) : all
}

export const getPlace = async (id: string): Promise<Place | undefined> => {
  if (USE_S3) {
    const res = await fetch(`/api/places/${id}`, { cache: "no-store" })
    if (!res.ok) return undefined
    return (await res.json()) as Place
  }
  return ensureSeeded().find((p) => p.id === id)
}

export const createPlace = async (
  data: Omit<Place, "id" | "createdAt" | "updatedAt">
): Promise<Place> => {
  if (USE_S3) {
    const res = await fetch(`/api/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to create place")
    return (await res.json()) as Place
  }
  const now = Date.now()
  const place: Place = { ...data, id: cryptoRandomId(), createdAt: now, updatedAt: now }
  const all = ensureSeeded()
  all.push(place)
  writeJSON(PLACES_KEY, all)
  return place
}

export const updatePlace = async (id: string, patch: Partial<Place>): Promise<Place | undefined> => {
  if (USE_S3) {
    const res = await fetch(`/api/places/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error("Failed to update place")
    return (await res.json()) as Place
  }
  const all = ensureSeeded()
  const idx = all.findIndex((p) => p.id === id)
  if (idx === -1) return undefined
  all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
  writeJSON(PLACES_KEY, all)
  return all[idx]
}

export const deletePlace = async (id: string): Promise<boolean> => {
  if (USE_S3) {
    const res = await fetch(`/api/places/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed to delete place")
    return true
  }
  const before = ensureSeeded()
  const after = before.filter((p) => p.id !== id)
  writeJSON(PLACES_KEY, after)
  return after.length !== before.length
}

// Search & Nearby work on whatever getPlaces() returns
export const searchPlaces = async (q: string): Promise<Place[]> => {
  const term = (q || "").trim().toLowerCase()
  const all = await getPlaces()
  if (!term) return all
  return all.filter((p) => {
    return (
      p.title?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.municipality?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    )
  })
}

export const getNearby = async (lat: number, lng: number, radiusKm: number): Promise<Place[]> => {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const all = await getPlaces()
  return all.filter((p) => {
    const dLat = toRad(p.coords.lat - lat)
    const dLng = toRad(p.coords.lng - lng)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(p.coords.lat)) * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c
    return d <= radiusKm
  })
}

// ---------- User Profile (local only for MVP) ----------
export const getUserProfile = async (uid: string): Promise<UserProfile | undefined> => {
  const profile = readJSON<UserProfile | undefined>(PROFILE_KEY, undefined as unknown as UserProfile | undefined)
  return profile && profile.uid === uid ? profile : undefined
}

export const upsertUserProfile = async (profile: Omit<UserProfile, "createdAt" | "updatedAt">): Promise<UserProfile> => {
  const now = Date.now()
  const existing = await getUserProfile(profile.uid)
  const merged: UserProfile = existing
    ? { ...existing, ...profile, updatedAt: now }
    : { ...profile, createdAt: now, updatedAt: now }
  writeJSON(PROFILE_KEY, merged)
  return merged
}

// ---------- Reports & Admin (local, simple) ----------
const readReports = (): Report[] => readJSON<Report[]>(REPORTS_KEY, [])
const writeReports = (reports: Report[]) => writeJSON(REPORTS_KEY, reports)

export const getReports = async (): Promise<Report[]> => readReports()

export const addReport = async (data: Omit<Report, "id" | "createdAt" | "status">): Promise<Report> => {
  const now = Date.now()
  const report: Report = { id: cryptoRandomId(), createdAt: now, status: "open", ...data }
  const all = readReports()
  all.push(report)
  writeReports(all)
  return report
}

export const resolveReport = async (id: string): Promise<boolean> => {
  const all = readReports()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return false
  all[idx] = { ...all[idx], status: "resolved" }
  writeReports(all)
  return true
}

export const getPlaceStats = async (): Promise<{
  total: number
  published: number
  pending: number
  flagged: number
  featured: number
}> => {
  const places = await getPlaces()
  const total = places.length
  const published = places.filter((p) => (p.status ?? "published") === "published").length
  const pending = places.filter((p) => p.status === "pending").length
  const flagged = places.filter((p) => p.status === "flagged").length
  const featured = places.filter((p) => p.featured === true).length
  return { total, published, pending, flagged, featured }
}

// ---------- Reviews (local, simple) ----------
const readReviews = (): Review[] => readJSON<Review[]>(REVIEWS_KEY, [])
const writeReviews = (reviews: Review[]) => writeJSON(REVIEWS_KEY, reviews)

export const getReviews = async (placeId: string): Promise<Review[]> =>
  readReviews().filter((r) => r.placeId === placeId).sort((a, b) => b.createdAt - a.createdAt)

export const addReview = async (data: Omit<Review, "id" | "createdAt">): Promise<Review> => {
  const now = Date.now()
  const review: Review = { id: cryptoRandomId(), createdAt: now, ...data }
  const all = readReviews()
  all.push(review)
  writeReviews(all)
  return review
}

export const getPlaceRatingSummary = async (
  placeId: string
): Promise<{ count: number; average: number }> => {
  const rs = await getReviews(placeId)
  const count = rs.length
  const average = count ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0
  return { count, average }
}

// kept for completeness
export const updateReport = async (id: string, patch: Partial<Report>): Promise<Report | undefined> => {
  const all = readJSON<Report[]>(REPORTS_KEY, [])
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return undefined
  all[idx] = { ...all[idx], ...patch }
  writeJSON(REPORTS_KEY, all)
  return all[idx]
}
