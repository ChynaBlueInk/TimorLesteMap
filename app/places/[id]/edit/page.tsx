// app/places/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlace, type Place } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import PlaceForm from "@/components/PlaceForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Edit } from "lucide-react";
import Link from "next/link";

export default function EditPlacePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const placeId = params.id as string;

  useEffect(() => {
    const loadPlace = async () => {
      try {
        const placeData = await getPlace(placeId);
        if (placeData) {
          setPlace(placeData);
        } else {
          setError("Place not found");
        }
      } catch (error) {
        console.error("Error loading place:", error);
        setError("Failed to load place");
      } finally {
        setLoading(false);
      }
    };

    if (placeId) {
      loadPlace();
    }
  }, [placeId]);

  // Check if user can edit this place
  const canEdit = place && user && (user.uid === place.ownerId || isAdmin);

  if (loading) {
    return (
      <ProtectedRoute requireAuth>
        <div className="min-h-screen bg-background">
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">Loading place...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !place) {
    return (
      <ProtectedRoute requireAuth>
        <div className="min-h-screen bg-background">
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="p-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h2 className="mb-2 text-xl font-semibold">Place Not Found</h2>
                <p className="mb-6 text-muted-foreground">
                  {error || "The place you are trying to edit does not exist."}
                </p>
                <Button asChild>
                  <Link href="/profile">Go to Profile</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!canEdit) {
    return (
      <ProtectedRoute requireAuth>
        <div className="min-h-screen bg-background">
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="p-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h2 className="mb-2 text-xl font-semibold">Access Denied</h2>
                <p className="mb-6 text-muted-foreground">
                  You don&apos;t have permission to edit this place.
                </p>
                <Button asChild>
                  <Link href={`/places/${place.id}`}>View Place</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                <Edit className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Edit Place</h1>
              </div>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Update the information for &quot;{place.title}&quot;.
              </p>
            </div>

            {/* PlaceForm still expects a language prop; pass fixed "en" */}
            <PlaceForm place={place} language="en" onCancel={() => router.push(`/places/${place.id}`)} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
