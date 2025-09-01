"use client"

import { useState, useEffect } from "react"
import { getPlaces, type Place, deletePlace } from "@/lib/firestore"
import { useAuth } from "@/hooks/useAuth"
import { useTranslation, type Language } from "@/lib/i18n"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UserIcon, Plus, Edit, Trash2, MapPin, Loader2 } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const { user, userProfile } = useAuth()
  const [language, setLanguage] = useState<Language>("en")
  const { t } = useTranslation(language)

  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [placeToDelete, setPlaceToDelete] = useState<Place | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadUserPlaces = async () => {
      if (!user) return

      try {
        const userPlaces = await getPlaces({ ownerId: user.uid })
        setPlaces(userPlaces)
      } catch (error) {
        console.error("Error loading user places:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserPlaces()
  }, [user])

  const handleDeletePlace = async () => {
    if (!placeToDelete) return

    setDeleting(true)
    try {
      await deletePlace(placeToDelete.id!)
      setPlaces(places.filter((p) => p.id !== placeToDelete.id))
      setDeleteDialogOpen(false)
      setPlaceToDelete(null)
    } catch (error) {
      console.error("Error deleting place:", error)
    } finally {
      setDeleting(false)
    }
  }

  const publishedPlaces = places.filter((p) => p.status === "published")
  const pendingPlaces = places.filter((p) => p.status === "pending")
  const flaggedPlaces = places.filter((p) => p.status === "flagged")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "flagged":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <ProtectedRoute requireAuth>
      <div className="min-h-screen bg-background">
        <Navigation language={language} onLanguageChange={setLanguage} />

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Profile Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL || "/placeholder.svg"}
                      alt={user.displayName || "User"}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{user?.displayName || "User"}</h1>
                  <p className="text-muted-foreground">{user?.email}</p>
                  {userProfile?.role === "admin" && (
                    <Badge variant="secondary" className="mt-2">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{places.length}</div>
                    <div className="text-sm text-muted-foreground">Total Places</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{publishedPlaces.length}</div>
                    <div className="text-sm text-muted-foreground">Published</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{pendingPlaces.length}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{flaggedPlaces.length}</div>
                    <div className="text-sm text-muted-foreground">Flagged</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Places Tabs */}
            <Tabs defaultValue="all" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="all">All Places ({places.length})</TabsTrigger>
                  <TabsTrigger value="published">Published ({publishedPlaces.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingPlaces.length})</TabsTrigger>
                  {flaggedPlaces.length > 0 && (
                    <TabsTrigger value="flagged">Flagged ({flaggedPlaces.length})</TabsTrigger>
                  )}
                </TabsList>

                <Button asChild>
                  <Link href="/submit">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("nav.submit")}
                  </Link>
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">{t("message.loading")}</p>
                  </div>
                </div>
              ) : (
                <>
                  <TabsContent value="all">
                    <PlacesList
                      places={places}
                      onDelete={(place) => {
                        setPlaceToDelete(place)
                        setDeleteDialogOpen(true)
                      }}
                      getStatusColor={getStatusColor}
                      t={t}
                    />
                  </TabsContent>

                  <TabsContent value="published">
                    <PlacesList
                      places={publishedPlaces}
                      onDelete={(place) => {
                        setPlaceToDelete(place)
                        setDeleteDialogOpen(true)
                      }}
                      getStatusColor={getStatusColor}
                      t={t}
                    />
                  </TabsContent>

                  <TabsContent value="pending">
                    <PlacesList
                      places={pendingPlaces}
                      onDelete={(place) => {
                        setPlaceToDelete(place)
                        setDeleteDialogOpen(true)
                      }}
                      getStatusColor={getStatusColor}
                      t={t}
                    />
                  </TabsContent>

                  <TabsContent value="flagged">
                    <PlacesList
                      places={flaggedPlaces}
                      onDelete={(place) => {
                        setPlaceToDelete(place)
                        setDeleteDialogOpen(true)
                      }}
                      getStatusColor={getStatusColor}
                      t={t}
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Place</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{placeToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlace}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  )
}

function PlacesList({
  places,
  onDelete,
  getStatusColor,
  t,
}: {
  places: Place[]
  onDelete: (place: Place) => void
  getStatusColor: (status: string) => string
  t: (key: any) => string
}) {
  if (places.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No places yet</h3>
          <p className="text-muted-foreground mb-4">Start sharing the places that matter to you with our community.</p>
          <Button asChild>
            <Link href="/submit">
              <Plus className="h-4 w-4 mr-2" />
              Submit Your First Place
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {places.map((place) => (
        <Card key={place.id} className="group">
          {place.images && place.images.length > 0 && (
            <div className="relative h-48 overflow-hidden rounded-t-lg">
              <img
                src={place.images[0] || "/placeholder.svg"}
                alt={place.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute top-2 right-2">
                <Badge className={getStatusColor(place.status)}>{t(`status.${place.status}`)}</Badge>
              </div>
            </div>
          )}

          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                {place.title}
              </h3>
            </div>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{place.description}</p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              <span>
                {place.municipality}, {place.suco}
              </span>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                <Link href={`/places/${place.id}`}>View Details</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/places/${place.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(place)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
