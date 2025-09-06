"use client"

import { useState, useEffect } from "react"
import { getPlaces, getReports, getPlaceStats, type Place, type Report } from "@/lib/firestore"
import { useTranslation, type Language } from "@/lib/i18n"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import AdminPlaceCard from "@/components/AdminPlaceCard"
import AdminReportCard from "@/components/AdminReportCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MapPin, Flag, Star, Clock, CheckCircle, AlertTriangle, Loader2, Shield } from "lucide-react"

export default function AdminPage() {
  const [language, setLanguage] = useState<Language>("en")
  const { t } = useTranslation(language)

  const [places, setPlaces] = useState<Place[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const [placesData, reportsData, statsData] = await Promise.all([getPlaces(), getReports(), getPlaceStats()])

        setPlaces(placesData)
        setReports(reportsData)
        setStats(statsData)
      } catch (error) {
        console.error("Error loading admin data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [])

  const handlePlaceUpdate = (updatedPlace: Place) => {
    setPlaces(places.map((p) => (p.id === updatedPlace.id ? updatedPlace : p)))
  }

  const handleReportUpdate = (updatedReport: Report) => {
    setReports(reports.map((r) => (r.id === updatedReport.id ? updatedReport : r)))
  }

  const pendingPlaces = places.filter((p) => p.status === "pending")
  const flaggedPlaces = places.filter((p) => p.status === "flagged")
  const publishedPlaces = places.filter((p) => p.status === "published")
  const pendingReports = reports.filter((r) => r.status === "pending")

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading admin dashboard...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-background">

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-muted-foreground">
                Manage places, moderate content, and oversee the Harii Timor community.
              </p>
            </div>

            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Places</p>
                        <p className="text-2xl font-bold">{stats.totalPlaces}</p>
                      </div>
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pendingPlaces}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Featured Places</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.featuredPlaces}</p>
                      </div>
                      <Star className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
                        <p className="text-2xl font-bold text-red-600">{stats.pendingReports}</p>
                      </div>
                      <Flag className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="pending" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending" className="relative">
                  Pending Review
                  {pendingPlaces.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                      {pendingPlaces.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="relative">
                  Reports
                  {pendingReports.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                      {pendingReports.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="published">Published ({publishedPlaces.length})</TabsTrigger>
                <TabsTrigger value="flagged">Flagged ({flaggedPlaces.length})</TabsTrigger>
              </TabsList>

              {/* Pending Places */}
              <TabsContent value="pending" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Places Awaiting Review ({pendingPlaces.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pendingPlaces.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingPlaces.map((place) => (
                          <AdminPlaceCard
                            key={place.id}
                            place={place}
                            onUpdate={handlePlaceUpdate}
                            language={language}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                        <p className="text-muted-foreground">No places are currently pending review.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reports */}
              <TabsContent value="reports" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="h-5 w-5" />
                      Content Reports ({pendingReports.length} pending)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reports.length > 0 ? (
                      <div className="space-y-4">
                        {reports.map((report) => (
                          <AdminReportCard
                            key={report.id}
                            report={report}
                            onUpdate={handleReportUpdate}
                            language={language}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No reports</h3>
                        <p className="text-muted-foreground">No content has been reported yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Published Places */}
              <TabsContent value="published" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Published Places ({publishedPlaces.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {publishedPlaces.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {publishedPlaces.map((place) => (
                          <AdminPlaceCard
                            key={place.id}
                            place={place}
                            onUpdate={handlePlaceUpdate}
                            language={language}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No published places</h3>
                        <p className="text-muted-foreground">No places have been published yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Flagged Places */}
              <TabsContent value="flagged" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Flagged Places ({flaggedPlaces.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {flaggedPlaces.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flaggedPlaces.map((place) => (
                          <AdminPlaceCard
                            key={place.id}
                            place={place}
                            onUpdate={handlePlaceUpdate}
                            language={language}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No flagged places</h3>
                        <p className="text-muted-foreground">No places are currently flagged.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
