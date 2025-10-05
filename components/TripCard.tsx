// components/TripCard.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Car,
  Route,
  Clock,
  MapPin,
  Eye,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Pin,
  CheckCircle2,
  Timer,
  XCircle,
  RefreshCw,
} from "lucide-react";
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
  /** Optional custom retry handler for failed publish attempts. */
  onRetry?: (trip: Trip) => Promise<void> | void;
  /** Compact variant for dense lists */
  compact?: boolean;
};

const START_PRESETS = {
  dili: { label: "Dili (default)", coords: { lat: -8.5586, lng: 125.5736 } },
  none: { label: "First stop", coords: null as any },
} as const;

export default function TripCard({
  trip,
  language = "en",
  href,
  onEdit,
  onDelete,
  onRetry,
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const [retryLoading, setRetryLoading] = useState(false);

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

  const daysLabel = typeof stats.estimatedDays === "number" ? `${stats.estimatedDays} days` : "—";

  const startLabel = trip.startKey === "none" ? "First stop" : "Dili";
  const endLabel = trip.customEndName ? trip.customEndName : undefined;

  // ---- Derive publish status (non-breaking; reads optional fields if present) ----
  type Status = "published" | "pending" | "failed" | undefined;
  const publishStatus: Status = useMemo(() => {
    const anyTrip = trip as any;
    // Prefer explicit status if your backend sets one
    if (anyTrip.publishStatus === "published") return "published";
    if (anyTrip.publishStatus === "pending") return "pending";
    if (anyTrip.publishStatus === "failed") return "failed";

    // Fallback heuristics
    if (anyTrip.lastPublishError) return "failed";
    if (anyTrip.publishPending) return "pending";
    if (trip.isPublic) return "published";

    return undefined;
  }, [trip]);

  // Optional inline retry (works if you have /api/trips/publish configured)
  const handleRetry = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!trip.id || retryLoading) return;

    try {
      setRetryLoading(true);
      if (onRetry) {
        await onRetry(trip);
      } else {
        const res = await fetch("/api/trips/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: trip.id }),
        });
        // Best-effort refresh; you can replace with router.refresh if desired
        if (res.ok) {
          // Re-fetch list externally; here we do a soft hint:
          // (no-op UI change; consumers should refresh list after retry)
        }
      }
    } finally {
      setRetryLoading(false);
    }
  };

  const StatusChip = () => {
    if (!publishStatus) return null;

    if (publishStatus === "published") {
      return (
        <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white border-transparent">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Published
        </Badge>
      );
    }

    if (publishStatus === "pending") {
      return (
        <Badge className="gap-1 bg-amber-500 hover:bg-amber-500 text-black border-transparent">
          <Timer className="h-3.5 w-3.5" />
          Pending
        </Badge>
      );
    }

    // failed
    return (
      <span className="inline-flex items-center gap-2">
        <Badge className="gap-1 bg-red-600 hover:bg-red-600 text-white border-transparent">
          <XCircle className="h-3.5 w-3.5" />
          Failed
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 gap-1"
          onClick={handleRetry}
          disabled={retryLoading}
          title="Retry publishing this trip"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${retryLoading ? "animate-spin" : ""}`} />
          Retry
        </Button>
      </span>
    );
  };

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
              <CardTitle className="truncate flex flex-wrap items-center gap-2">
                {trip.name || "Untitled Trip"}

                {/* Public/Private flag */}
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

                {/* Publish status chip (Published / Pending / Failed → Retry) */}
                <StatusChip />

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
