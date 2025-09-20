// app/trips/saved/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserTrips, type Trip } from "@/lib/trips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Plus } from "lucide-react";

export default function SavedTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // You currently create trips with ownerId: "anonymous"
        const data = await getUserTrips("anonymous");
        setTrips(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My saved trips</h1>
        <Link href="/plan-trip">
          <Button><Plus className="mr-2 h-4 w-4" /> New trip</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : trips.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">No saved trips yet.</p>
            <div className="mt-3">
              <Link href="/plan-trip">
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Plan your first trip</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <Link key={t.id} href={`/trips/${t.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    {t.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="line-clamp-2">{t.description || "No description"}</p>
                  <p className="mt-2">
                    {t.places.length} stop{t.places.length === 1 ? "" : "s"} • Updated{" "}
                    {t.updatedAt instanceof Date
                      ? t.updatedAt.toLocaleDateString()
                      : new Date(t.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
