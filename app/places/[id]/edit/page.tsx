"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getPlace, type Place } from "@/lib/firestore"
import { useAuth } from "@/hooks/useAuth"
import { useTranslation, type Language } from "@/lib/i18n"
import Navigation from "@/components/Navigation"
import PlaceForm from "@/components/PlaceForm"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Edit } from "lucide-react"
import Link from "next/link"

export default function EditPlacePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const [language, setLanguage] = useState<Language>("en")
  const { t } = useTranslation(language)

  const [place, setPlace] = useState<Place | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const placeId = params.id as string

  useEffect(() => {
    const loadPlace = async () => {
      try {
        const placeData = await getPlace(placeId)
        if (placeData) {
          setPlace(placeData)
        } else {
          setError("Place not found")
        }
      } catch (error) {
        console.error("Error loading place:", error)
        setError("Failed to load place")
      } finally {
        setLoading(false)
      }
    }

    if (placeId) {
      loadPlace()
    }
  }, [placeId])

  // Check if user can edit this place
  const canEdit = place && user && (user.uid === place.ownerId || isAdmin)

  if (loading) {
    return (
      <ProtectedRoute requireAuth>
        <div className="min-h-screen bg-background">
          <Navigation language={language} onLanguageChange={setLanguage} />
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading place...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !place) {
    return (
      <ProtectedRoute requireAuth>
        <div className="min-h-screen bg-background">
          <Navigation language={language} onLanguageChange={setLanguage} />
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <Card className="w-full max-w-md">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Place Not Found</h2>
                <p className="text-muted-foreground mb-6">
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
    )
  }

  if (!canEdit) {
    return (
      <ProtectedRoute requireAuth>
        <div className="min-h-screen bg-background">
          <Navigation language={language} onLanguageChange={setLanguage} />
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <Card className="w-full max-w-md">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-6">You don't have permission to edit this place.</p>
                <Button asChild>
                  <Link href={`/places/${place.id}`}>View Place</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requireAuth>
      <div className="min-h-screen bg-background">
        <Navigation language={language} onLanguageChange={setLanguage} />

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Edit className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Edit Place</h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Update the information for "{place.title}". Your changes will be reviewed before being published.
              </p>
            </div>

            <PlaceForm place={place} language={language} onCancel={() => router.push(`/places/${place.id}`)} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
