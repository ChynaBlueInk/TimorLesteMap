// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Map, Plus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation, type Language } from "@/lib/i18n";
import { getPlaces, type Place } from "@/lib/firestore";

export default function HomePage() {
  const [language] = useState<Language>("en");
  const { t } = useTranslation(language);
  const router = useRouter();

  // Simple search -> redirect to /map?q=...
  const [q, setQ] = useState("");

  // Lightweight community gallery (uses first image of recent places)
  const [gallery, setGallery] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGallery(true);
      try {
        const all = await getPlaces();
        // newest first
        const sorted = [...all].sort(
          (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
        );
        const urls: string[] = [];
        for (const p of sorted) {
          const first = Array.isArray(p.images) && p.images[0];
          if (typeof first === "string") {
            urls.push(first);
          }
          if (urls.length >= 8) break; // cap to keep it fast
        }
        if (!cancelled) setGallery(urls);
      } catch {
        if (!cancelled) setGallery([]);
      } finally {
        if (!cancelled) setLoadingGallery(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    const dest = trimmed ? `/map?q=${encodeURIComponent(trimmed)}` : "/map";
    router.push(dest);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-muted/40 to-background">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold md:text-5xl">
              Discover Timor-Leste
            </h1>
            <p className="mt-3 text-muted-foreground">
              Search the map of historical, cultural, and natural places.
            </p>

            {/* Search that redirects to /map */}
            <form
              onSubmit={onSearchSubmit}
              className="mx-auto mt-6 flex max-w-xl items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search places, municipalities, keywords…"
                  className="pl-9"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            {/* Primary CTAs */}
            <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-3">
              {/* ✅ Browse Map goes to /map (not /places) */}
              <Button asChild>
                <Link href="/map" className="gap-2">
                  <Map className="h-4 w-4" />
                  Browse Map
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/submit" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Submit a Place
                </Link>
              </Button>
              {/* Keep “Plan a Trip” as a simple link only.
                 If /trips has a client error, it won’t break Home. */}
              <Button variant="ghost" asChild>
                <Link href="/trips" className="gap-2">
                  <Camera className="h-4 w-4" />
                  Plan a Trip
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Community Gallery (fast, lazy, only shows if we have images) */}
      {gallery.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <h2 className="mb-4 text-2xl font-semibold">Community Gallery</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            A few recent photos from submitted places.
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
            {gallery.map((src, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Community photo ${i + 1}`}
                    className="h-40 w-full object-cover md:h-44"
                    loading="lazy"
                    crossOrigin="anonymous"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Fallback when there are no images */}
      {gallery.length === 0 && !loadingGallery && (
        <section className="container mx-auto px-4 py-10">
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No featured items yet — explore the <Link href="/map" className="underline">map</Link> or{" "}
              <Link href="/submit" className="underline">submit a place</Link>.
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
