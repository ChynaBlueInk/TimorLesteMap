// app/trips/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TripCard from "@/components/TripCard";
import {
  getAllTrips,
  deleteTrip as removeTrip,
  type Trip,
  type TripPlace,
} from "@/lib/trips";
import { PlusCircle } from "lucide-react";

type ApiTrip = Omit<Trip, "createdAt" | "updatedAt"> & {
  createdAt: number;
  updatedAt: number;
};

/** Coerce API payload -> Trip (Date fields revived) */
function reviveApiTrip(t: ApiTrip): Trip {
  return {
    ...t,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
    // make sure places array exists & has minimal shape
    places: Array.isArray(t.places)
      ? (t.places as TripPlace[])
      : [],
  };
}

export default function TripsPage() {
  const router = useRouter();
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [publicTrips, setPublicTrips] = useState<Trip[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingPublic, setLoadingPublic] = useState(true);

  const loadSaved = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const mine = await getAllTrips(); // local saved trips (anonymous mode)
      setSavedTrips(mine);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  const loadPublic = useCallback(async () => {
    setLoadingPublic(true);
    try {
      const res = await fetch("/api/trips", { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /api/trips ${res.status}`);
      const data = (await res.json()) as ApiTrip[];
      setPublicTrips(data.map(reviveApiTrip));
    } catch (err) {
      console.error("Failed to load public trips:", err);
      setPublicTrips([]);
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    // Load both sections
    loadSaved();
    loadPublic();
  }, [loadSaved, loadPublic]);

  const handleEdit = (trip: Trip) => {
    router.push(`/plan-trip?edit=${trip.id}`);
  };

  const handleDelete = async (trip: Trip) => {
    const ok = window.confirm(`Delete trip "${trip.name}"? This cannot be undone.`);
    if (!ok) return;
    await removeTrip(trip.id);
    // Refresh both sections (in case a deleted public trip was also saved locally)
    await Promise.all([loadSaved(), loadPublic()]);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trips</h1>
          <p className="text-muted-foreground">
            View your saved trips, browse public itineraries, or plan a new one.
          </p>
        </div>
        <Button asChild>
          <Link href="/plan-trip">
            <PlusCircle className="mr-2 h-4 w-4" />
            Plan a Trip
          </Link>
        </Button>
      </div>

      {/* Your Saved Trips */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Saved Trips</h2>
          {savedTrips.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/plan-trip">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Trip
              </Link>
            </Button>
          )}
        </div>

        {loadingSaved ? (
          <p className="text-muted-foreground">Loading your trips…</p>
        ) : savedTrips.length === 0 ? (
          <EmptySaved />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {savedTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                href={`/trips/${trip.id}`}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* Public Trips (from server API) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Public Trips</h2>
        {loadingPublic ? (
          <p className="text-muted-foreground">Loading public trips…</p>
        ) : publicTrips.length === 0 ? (
          <EmptyPublic />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {publicTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} href={`/trips/${trip.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptySaved() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-8">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-lg font-semibold mb-2">No trips saved yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Start planning your first itinerary and it will show up here.
          </p>
          <Button asChild>
            <Link href="/plan-trip">
              <PlusCircle className="mr-2 h-4 w-4" />
              Plan a Trip
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPublic() {
  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-0">
        <CardTitle className="text-lg">No public trips yet</CardTitle>
      </CardHeader>
      <CardContent className="py-6">
        <p className="text-sm text-muted-foreground">
          Be the first to share an itinerary! Make your trip public when saving.
        </p>
      </CardContent>
    </Card>
  );
}
