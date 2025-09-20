// app/trips/saved/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserTrips, deleteTrip, type Trip } from "@/lib/trips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Route, Plus, Pencil, Trash2 } from "lucide-react";

export default function SavedTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // You currently save with ownerId: "anonymous"
        const data = await getUserTrips("anonymous");
        setTrips(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

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
            <Card key={t.id} className="flex h-full flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  {t.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between text-sm text-muted-foreground">
                <div>
                  <p className="line-clamp-2">{t.description || "No description"}</p>
                  <p className="mt-2">
                    {t.places.length} stop{t.places.length === 1 ? "" : "s"} • Updated{" "}
                    {t.updatedAt instanceof Date
                      ? t.updatedAt.toLocaleDateString()
                      : new Date(t.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {/* View (optional, if you have /trips/[id]) */}
                  <Link href={`/trips/${t.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>

                  {/* Edit: send to Trip Planner with the id as a query param */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/plan-trip?trip=${encodeURIComponent(t.id)}`)}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </Button>

                  {/* Delete with confirm */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === t.id}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        {deletingId === t.id ? "Deleting…" : "Delete"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{t.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the trip from your saved list. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(t.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
