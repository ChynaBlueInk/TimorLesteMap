// app/plan-trip/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { getTrip, type Trip } from "@/lib/trips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Map } from "lucide-react";

// Crash-proof dynamic import with SSR disabled + graceful fallback
const TripPlanner: any = dynamic(
  () =>
    import("@/components/TripPlanner")
      .then((m) => m.default ?? m)
      .catch((err) => {
        console.error("TripPlanner failed to load:", err);
        // Tiny fallback component if import fails
        return function TripPlannerMissing() {
          return (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Trip planner unavailable
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The Trip Planner component failed to load. Please try again or return to Trips.
                </p>
                <Button asChild variant="outline">
                  <a href="/trips">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Trips
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        };
      }),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Loading Trip Planner…
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Preparing the planner interface…</p>
        </CardContent>
      </Card>
    ),
  }
);

export default function PlanTripPage() {
  const params = useSearchParams();
  const router = useRouter();

  // Accept BOTH ?edit=<id> and ?trip=<id>
  const tripId = params.get("edit") ?? params.get("trip");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState<boolean>(!!tripId);
  const [error, setError] = useState<string | null>(null);

  // Load the trip only when editing (i.e., when a trip id is present)
  useEffect(() => {
    let cancelled = false;
    if (!tripId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await getTrip(tripId);
        if (!cancelled) setTrip(t ?? null);
      } catch (e: any) {
        console.error("Failed to load trip:", e);
        if (!cancelled) setError(e?.message || "Failed to load trip");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const heading = useMemo(() => (tripId ? "Edit Trip" : "Plan a Trip"), [tripId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{heading}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading trip…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {heading}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/trips/saved")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Trips
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TripPlanner
        trip={trip ?? undefined}
        onSave={() => router.push("/trips/saved")}
        onCancel={() => router.push("/trips/saved")}
      />
    </div>
  );
}
