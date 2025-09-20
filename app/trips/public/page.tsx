// app/trips/public/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicTrips, type Trip } from "@/lib/trips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Route, Globe2 } from "lucide-react";

export default function PublicTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicTrips();
        setTrips(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Public trips</h1>
        <Badge variant="secondary" className="inline-flex items-center gap-1">
          <Globe2 className="h-3.5 w-3.5" /> Browse & copy
        </Badge>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : trips.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">No public trips yet.</p>
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
