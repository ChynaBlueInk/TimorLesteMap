// app/plan-trip/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TripPlanner from "@/components/TripPlanner";
import { getTrip, type Trip } from "@/lib/trips";

export default function PlanTripPage() {
  const params = useSearchParams();
  const router = useRouter();
  const editId = params.get("edit");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState<boolean>(!!editId);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      setLoading(true);
      const t = await getTrip(editId);
      setTrip(t);
      setLoading(false);
    })();
  }, [editId]);

  if (loading) return <p className="p-6 text-muted-foreground">Loading trip…</p>;

  return (
    <div className="container mx-auto px-4 py-6">
      <TripPlanner
        trip={trip ?? undefined}
        onSave={() => router.push("/trips")}
        onCancel={() => router.push("/trips")}
      />
    </div>
  );
}
