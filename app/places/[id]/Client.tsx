// app/places/[id]/Client.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlace, deletePlace, type Place } from "@/lib/firestore";
import MapView from "@/components/MapView";
import Reviews from "@/components/Reviews";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PlaceDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const p = await getPlace(id);
        if (!cancelled) setPlace(p || null);
        if (!cancelled && !p) setError("Place not found.");
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load place.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error || !place ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{error || "Place not found."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">{place.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{place.category}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {place.municipality}
                      {place.suco ? `, ${place.suco}` : ""}
                    </span>
                    {place.period && (place.period.fromYear || place.period.toYear) && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {place.period.fromYear && place.period.toYear
                          ? `${place.period.fromYear}–${place.period.toYear}`
                          : place.period.fromYear
                          ? `From ${place.period.fromYear}`
                          : `Until ${place.period.toYear}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit / Delete actions */}
                <div className="flex gap-2">
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
                      router.push("/places");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Image gallery */}
              {Array.isArray(place.images) && place.images.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {place.images.map((src: string, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`${place.title} image ${i + 1}`}
                          className="h-64 w-full rounded object-cover md:h-80"
                          crossOrigin="anonymous"
                          draggable={false}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No images yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can add images by choosing <strong>Edit</strong> above.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Map (no fragile direct access to coords) */}
              <Card>
                <CardContent className="p-0">
                  <div className="h-[360px]">
                    <MapView
                      places={[place]}
                      zoom={14}
                      attributionControl={false}
                      zoomControl={true}
                      className="h-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* About */}
              {place.description ? (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="mb-2 font-semibold">About</h3>
                    <p className="text-muted-foreground">{place.description}</p>
                  </CardContent>
                </Card>
              ) : null}

              <Reviews placeId={place.id} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-2 font-semibold">Sources</h3>
                  {Array.isArray(place.sources) && place.sources.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {place.sources.map((s: any, idx: number) => {
                        const label = typeof s === "string" ? s : s?.label ?? s?.url ?? `Source ${idx + 1}`;
                        const url = typeof s === "string" ? s : s?.url ?? undefined;
                        return (
                          <li key={idx}>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">
                                {label}
                              </a>
                            ) : (
                              label
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sources listed.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
