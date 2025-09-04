// components/PlaceCard.tsx
"use client"

import type { Place } from "@/lib/firestore"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, ExternalLink, Star, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { deletePlace } from "@/lib/firestore"

interface PlaceCardProps {
  place: Place
  showActions?: boolean
  onViewOnMap?: (place: Place) => void
  /** Show edit/delete management actions */
  showManage?: boolean
  /** Called after a successful delete so parent can refresh */
  onDeleted?: (id: string) => void
}

// Include legacy "memorials" to satisfy any wider unions elsewhere
const categoryPills: Record<Place["category"] | "memorials", string> = {
  history: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  culture: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  nature: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  food: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  memorial: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  memorials: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", // alias
  other: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
}

export default function PlaceCard({ place, showActions = true, onViewOnMap, showManage = false, onDeleted }: PlaceCardProps) {
  return (
    <Card className="group overflow-hidden rounded-xl border-0 shadow-sm ring-1 ring-border transition hover:shadow-xl">
      {/* Decorative top flag gradient bar */}
      <div className="h-1.5 w-full bg-flag-gradient" />

      {/* Media */}
      <div className="relative h-48">
        <div className="absolute inset-0">
          <img
            src={(place.images && place.images[0]) || "/placeholder.svg"}
            alt={place.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {place.featured ? (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-400 text-black shadow-md">
              <Star className="mr-1 h-3 w-3" />
              Featured
            </Badge>
          </div>
        ) : null}

        <div className="absolute bottom-2 left-2">
          <Badge className={`${categoryPills[place.category]} shadow-md`}>{place.category}</Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="text-lg font-semibold leading-tight tracking-tight">
          <span className="bg-gradient-to-r from-tl-red via-tl-yellow to-tl-black bg-clip-text text-transparent">
            {place.title}
          </span>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{place.description}</p>

        <div className="mt-3 space-y-2">
          {place.municipality || place.suco ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {place.municipality}
                {place.suco ? `, ${place.suco}` : ""}
              </span>
            </div>
          ) : null}

          {place.period && (place.period.fromYear || place.period.toYear) ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {place.period.fromYear && place.period.toYear
                  ? `${place.period.fromYear} - ${place.period.toYear}`
                  : place.period.fromYear
                  ? `From ${place.period.fromYear}`
                  : `Until ${place.period.toYear}`}
              </span>
            </div>
          ) : null}
        </div>
      </CardContent>

      {showActions ? (
        <CardFooter className="flex flex-wrap gap-2 p-4 pt-0">
          <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent hover:bg-white/60">
            <Link href={`/places/${place.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </Button>

          {onViewOnMap ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewOnMap(place)}
              className="bg-flag-gradient text-white hover:opacity-90"
              title="View on map"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          ) : null}

          {showManage && (
            <>
              <Button asChild variant="secondary" size="sm" className="gap-2">
                <Link href={`/submit?edit=${place.id}`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  const ok = window.confirm(`Delete "${place.title}"? This cannot be undone.`);
                  if (!ok) return;
                  await deletePlace(place.id);
                  onDeleted?.(place.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </CardFooter>
      ) : null}
    </Card>
  )
}
