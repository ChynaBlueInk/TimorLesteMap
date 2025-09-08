"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTrip, deleteTrip, type Trip } from "@/lib/trips";

export default function TripDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(undefined);
      try {
        // 1) Try local (user's own or recently edited)
        const local = await getTrip(id);
        if (!cancelled && local) {
          setTrip(local);
          return;
        }

        // 2) Fallback to server public trips
        const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (res.ok) {
          const raw = await res.json();
          const revived: Trip = {
            ...raw,
            createdAt: new Date(raw.createdAt),
            updatedAt: new Date(raw.updatedAt),
          };
          if (!cancelled) setTrip(revived);
        } else {
          if (!cancelled) setError("Trip not found.");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load trip.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{error || "Trip not found."}</p>
              <div className="mt-4">
                <Button asChild>
                  <Link href="/trips">Back to Trips</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{trip.name}</h1>
            {trip.description ? (
              <p className="mt-2 text-muted-foreground">{trip.description}</p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              {trip.places.length} {trip.places.length === 1 ? "place" : "places"}
              {trip.isPublic ? " • Public" : " • Private"}
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/plan-trip?edit=${trip.id}`}>Edit</Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const ok = window.confirm(`Delete trip "${trip.name}"? This cannot be undone.`);
                if (!ok) return;
                await deleteTrip(trip.id);
                router.push("/trips");
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {trip.places.length === 0 ? (
              <p className="text-muted-foreground">No places in this trip yet.</p>
            ) : (
              <ul className="space-y-3">
                {trip.places
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((tp, i) => (
                    <li key={tp.placeId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {i + 1}. {tp.place?.title ?? tp.placeId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tp.place?.coords?.lat?.toFixed?.(4)}, {tp.place?.coords?.lng?.toFixed?.(4)}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/places/${tp.placeId}`}>View Place</Link>
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}