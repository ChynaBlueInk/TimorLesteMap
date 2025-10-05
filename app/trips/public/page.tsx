// app/trips/public/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe2, Route } from "lucide-react";

type TripPhoto = { url: string; alt?: string };
type Trip = {
  id: string;
  name: string;
  description?: string;
  updatedAt?: string | number | Date;
  places: Array<{
    place?: { images?: string[] };
    images?: string[]; // in case your schema sometimes puts images here
  }>;
  tripPhotos?: TripPhoto[];
  coverUrl?: string;
};

function deriveCoverUrl(t: any): string | undefined {
  // 1) preferred: first trip photo
  const tripPhotoUrl = t?.tripPhotos?.[0]?.url;
  if (typeof tripPhotoUrl === "string" && tripPhotoUrl.trim().length > 0) {
    return tripPhotoUrl;
  }

  // 2) fallback: first image from any place
  const places = Array.isArray(t?.places) ? t.places : [];
  for (const p of places) {
    const fromPlaceObj = p?.place?.images?.[0];
    if (typeof fromPlaceObj === "string" && fromPlaceObj.trim().length > 0) {
      return fromPlaceObj;
    }
    const fromPlaceDirect = p?.images?.[0];
    if (typeof fromPlaceDirect === "string" && fromPlaceDirect.trim().length > 0) {
      return fromPlaceDirect;
    }
  }

  // 3) no cover found
  return undefined;
}

async function loadPublicTrips(): Promise<Trip[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/trips/public`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load public trips (${res.status})`);
  }
  const data = (await res.json()) as any[];

  return Array.isArray(data)
    ? data.map((t) => {
        const coverUrl = deriveCoverUrl(t);
        return {
          id: t.id,
          name: t.name ?? t.title ?? "Untitled trip",
          description: t.description ?? t.summary ?? "",
          updatedAt: t.updatedAt ?? t.publishedAt ?? t.createdAt ?? Date.now(),
          places: Array.isArray(t.places) ? t.places : [],
          tripPhotos: Array.isArray(t.tripPhotos) ? t.tripPhotos : [],
          coverUrl,
        } as Trip;
      })
    : [];
}

export default async function PublicTripsPage() {
  let trips: Trip[] = [];
  try {
    trips = await loadPublicTrips();
  } catch {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Public trips</h1>
          <Badge variant="secondary" className="inline-flex items-center gap-1">
            <Globe2 className="h-3.5 w-3.5" /> Browse & copy
          </Badge>
        </div>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-red-600">
              Failed to load public trips. Please check <code>/api/trips/public</code> and your server env keys.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Public trips</h1>
        <Badge variant="secondary" className="inline-flex items-center gap-1">
          <Globe2 className="h-3.5 w-3.5" /> Browse & copy
        </Badge>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">No public trips yet. Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => {
            const updated =
              t.updatedAt instanceof Date
                ? t.updatedAt.toLocaleDateString()
                : new Date(t.updatedAt ?? Date.now()).toLocaleDateString();

            return (
              <Link key={t.id} href={`/trips/${t.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                  {/* Cover image (uses <img> to avoid Next/Image remote config) */}
                  {t.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.coverUrl}
                      alt={t.name}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p className="line-clamp-2">
                      {t.description && t.description.trim().length > 0 ? t.description : "No description"}
                    </p>
                    <p className="mt-2">
                      {t.places?.length ?? 0} stop{(t.places?.length ?? 0) === 1 ? "" : "s"} • Updated {updated}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
