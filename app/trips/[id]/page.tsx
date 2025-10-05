// app/trips/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getTrip,
  createTrip,
  calculateTripStats,
  type Trip,
  type TransportMode,
  type RoadCondition,
} from "@/lib/trips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Calendar, Car, Copy, MapPin, Route } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type OriginInfo = {
  href: string;
  label: string;
  canGoBack: boolean;
};

function useOriginInfo(): OriginInfo {
  const [info, setInfo] = useState<OriginInfo>({
    href: "/trips",
    label: "Return to Trips",
    canGoBack: false,
  });

  useEffect(() => {
    try {
      const loc = window.location;
      const params = new URLSearchParams(loc.search);
      const forced = params.get("from"); // "public" | "saved" | "all"

      const ref = document.referrer || "";
      const sameOrigin = ref.startsWith(`${loc.origin}/`);

      const pick = (kind: "public" | "saved" | "all") => {
        if (kind === "public") return { href: "/trips/public", label: "Return to Public Trips" };
        if (kind === "saved") return { href: "/trips/saved", label: "Return to Saved Trips" };
        return { href: "/trips", label: "Return to Trips" };
      };

      let chosen = pick("all");

      if (forced === "public") chosen = pick("public");
      else if (forced === "saved") chosen = pick("saved");
      else if (forced === "all") chosen = pick("all");
      else if (sameOrigin) {
        if (ref.includes("/trips/public")) chosen = pick("public");
        else if (ref.includes("/trips/saved")) chosen = pick("saved");
        else if (ref.includes("/trips")) chosen = pick("all");
      }

      setInfo({ ...chosen, canGoBack: sameOrigin });
    } catch {
      setInfo({ href: "/trips", label: "Return to Trips", canGoBack: false });
    }
  }, []);

  return info;
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const origin = useOriginInfo();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Try SERVER first (works for public trips across devices)
        const base = process.env.NEXT_PUBLIC_BASE_URL || "";
        const res = await fetch(`${base}/api/trips/${encodeURIComponent(params.id)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const raw = await res.json();
          const revived: Trip = {
            ...raw,
            createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date(),
            updatedAt: raw?.updatedAt ? new Date(raw.updatedAt) : new Date(),
          };
          setTrip(revived);
          return;
        }

        // 2) Fallback to LOCAL (user’s own/saved trips)
        const local = await getTrip(params.id);
        if (!local) {
          setError("Trip not found.");
        } else {
          setTrip(local);
        }
      } catch (e: any) {
        // Final fallback to local if fetch threw (e.g., offline)
        try {
          const local = await getTrip(params.id);
          if (!local) {
            setError(e?.message || "Failed to load trip.");
          } else {
            setTrip(local);
          }
        } catch {
          setError(e?.message || "Failed to load trip.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id]);

  const stats = useMemo(() => (trip ? calculateTripStats(trip) : null), [trip]);

  const mode: TransportMode = trip?.transportMode ?? "car";
  const roads: RoadCondition = trip?.roadCondition ?? "mixed";

  const handleDuplicate = async () => {
    if (!trip) return;
    setDuplicating(true);
    try {
      const copyName = trip.name?.startsWith("Copy of ") ? trip.name : `Copy of ${trip.name}`;

      const payload = {
        name: copyName,
        description: trip.description ?? "",
        places: trip.places, // same order & notes
        ownerId: "anonymous",
        isPublic: false, // copies start private
        transportMode: mode,
        roadCondition: roads,
        estimatedDuration: (trip as any).estimatedDuration,
      } as const;

      const { id } = await createTrip(payload as any);
      router.replace(`/trips/${id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to duplicate trip.");
    } finally {
      setDuplicating(false);
    }
  };

  const goBack = () => {
    if (origin.canGoBack) {
      router.back();
    } else {
      router.push(origin.href);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading trip…</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {origin.label}
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error ?? "Trip not found."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="outline" className="mb-3" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {origin.label}
          </Button>
          <h1 className="text-3xl font-bold">{trip.name}</h1>
          {trip.description && (
            <p className="text-muted-foreground max-w-3xl">{trip.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="secondary" className="text-xs capitalize">{mode}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{roads}</Badge>
            <Badge variant="outline" className="text-xs">{trip.places.length} stops</Badge>
            <span className="text-xs text-muted-foreground">
              Updated {new Date(trip.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleDuplicate} disabled={duplicating}>
            <Copy className="mr-2 h-4 w-4" />
            {duplicating ? "Duplicating…" : "Duplicate this trip"}
          </Button>
        </div>
      </div>

      {/* Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Trip Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{Math.round(stats.totalDistance)} km</p>
                  <p className="text-xs text-muted-foreground">Total Distance</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{Math.round(stats.totalTime)} hours</p>
                  <p className="text-xs text-muted-foreground">Travel Time</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{stats.estimatedDays} days</p>
                  <p className="text-xs text-muted-foreground">Recommended Duration</p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Mode: <span className="font-medium capitalize">{mode}</span> • Roads:{" "}
              <span className="font-medium capitalize">{roads}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itinerary */}
      <Card>
        <CardHeader>
          <CardTitle>Itinerary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trip.places.length === 0 ? (
            <p className="text-muted-foreground">No stops added.</p>
          ) : (
            <div className="space-y-3">
              {trip.places
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((tp, idx) => (
                  <div key={tp.placeId} className="rounded border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Stop {idx + 1}</Badge>
                          <h3 className="font-medium">{tp.place.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <MapPin className="inline-block h-3 w-3 mr-1" />
                          {tp.place.municipality ?? "Unknown"} • {renderCategory(t, tp.place.category)}
                        </p>
                      </div>
                    </div>
                    {tp.notes && (
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Notes:</span> {tp.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to render category via i18n (safe keys only)
function renderCategory(t: ReturnType<typeof useTranslation>["t"], cat: string) {
  const key =
    cat === "history" ? "category.history" :
    cat === "culture" ? "category.culture" :
    cat === "nature" ? "category.nature" :
    cat === "food" ? "category.food" :
    cat === "memorials" ? "category.memorials" :
    "category.nature";
  return t(key);
}
