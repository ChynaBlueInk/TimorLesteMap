// components/TripCard.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Car, Route, Clock, MapPin, Eye, Pencil, Trash2, Lock, Unlock, Pin } from "lucide-react";
import { type Trip, calculateTripStats } from "@/lib/trips";
import { useTranslation, type Language } from "@/lib/i18n";

type Props = {
  trip: Trip;
  language?: Language;
  /** If provided, the whole card becomes a link (e.g. `/trips/${trip.id}`) */
  href?: string;
  /** Optional action handlers (Edit/Delete). If omitted, buttons are hidden. */
  onEdit?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
  /** Compact variant for dense lists */
  compact?: boolean;
};

const START_PRESETS = {
  dili: { label: "Dili (default)", coords: { lat: -8.5586, lng: 125.5736 } },
  none: { label: "First stop", coords: null as any },
} as const;

export default function TripCard({ trip, language = "en", href, onEdit, onDelete, compact = false }: Props) {
  const { t } = useTranslation();

  const startCoords = useMemo(() => {
    return trip.startKey === "none" ? undefined : START_PRESETS.dili.coords;
  }, [trip.startKey]);

  const endCoords = trip.customEndCoords;

  const stats = useMemo(() => {
    return calculateTripStats(trip, { startCoords, endCoords });
  }, [trip, startCoords, endCoords]);

  const usesOverride =
    typeof trip.overrideDistanceKm === "number" || typeof trip.overrideTimeHours === "number";

  const distanceLabel =
    typeof stats.totalDistance === "number" ? `${Math.round(stats.totalDistance)} km` : "—";

  // Show one decimal for hours to avoid big rounding jumps (e.g., 2.3 h)
  const hoursRounded =
    typeof stats.totalTime === "number" ? Math.round(stats.totalTime * 10) / 10 : undefined;
  const timeLabel = typeof hoursRounded === "number" ? `${hoursRounded} hours` : "—";

  const daysLabel =
    typeof stats.estimatedDays === "number" ? `${stats.estimatedDays} days` : "—";

  const startLabel = trip.startKey === "none" ? "First stop" : "Dili";
  const endLabel = trip.customEndName ? trip.customEndName : undefined;

  const Container = href ? Link : "div";
  const containerProps = href
    ? { href, className: "block focus:outline-none" }
    : { className: "" };

  return (
    <Container {...(containerProps as any)}>
      <Card className={`hover:shadow-md transition-shadow ${href ? "cursor-pointer" : ""}`}>
        <CardHeader className={`${compact ? "py-3" : "py-4"}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate flex items-center gap-2">
                {trip.name || "Untitled Trip"}
                <Badge variant="outline" className="gap-1">
                  {trip.isPublic ? (
                    <>
                      <Unlock className="h-3.5 w-3.5" /> Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Private
                    </>
                  )}
                </Badge>
                {usesOverride && (
                  <Badge variant="secondary" className="gap-1">
                    <Pencil className="h-3.5 w-3.5" />
                    Manual override
                  </Badge>
                )}
              </CardTitle>
              {trip.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {trip.description}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(trip.updatedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className={`${compact ? "pt-0 pb-3" : "pt-0 pb-4"}`}>
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{distanceLabel}</p>
                <p className="text-xs text-muted-foreground">Total Distance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{timeLabel}</p>
                <p className="text-xs text-muted-foreground">Travel Time</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{daysLabel}</p>
                <p className="text-xs text-muted-foreground">Recommended Duration</p>
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Start: <span className="font-medium">{startLabel}</span>
            </span>
            {endLabel && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  End: <span className="font-medium">{endLabel}</span>
                </span>
              </>
            )}
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Car className="h-3.5 w-3.5" />
              Mode: <span className="capitalize font-medium">{trip.transportMode ?? "car"}</span>
            </span>
            <span>•</span>
            <span>
              Roads: <span className="capitalize font-medium">{trip.roadCondition ?? "mixed"}</span>
            </span>
            <span>•</span>
            <span>{trip.places?.length ?? 0} stops</span>
          </div>
        </CardContent>

        {(href || onEdit || onDelete) && (
          <CardFooter className={`${compact ? "pt-0 pb-3" : "pt-0 pb-4"} flex justify-between`}>
            {href ? (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={href}>
                  <Eye className="h-4 w-4" />
                  View details
                </Link>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(trip);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(trip);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </CardFooter>
        )}
      </Card>
    </Container>
  );
}
