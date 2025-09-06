"use client"

import { useState } from "react"
import { type Report, updateReport, getPlace, type Place } from "@/lib/firestore"
import { useTranslation, type Language } from "@/lib/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Check, Eye, Flag, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

interface AdminReportCardProps {
  report: Report
  onUpdate: (report: Report) => void
  language?: Language
}

export default function AdminReportCard({ report, onUpdate, language = "en" }: AdminReportCardProps) {
  const { t } = useTranslation(language)
  const [loading, setLoading] = useState(false)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [place, setPlace] = useState<Place | null>(null)

  useEffect(() => {
    const loadPlace = async () => {
      try {
        const placeData = await getPlace(report.placeId)
        setPlace(placeData)
      } catch (error) {
        console.error("Error loading place:", error)
      }
    }

    loadPlace()
  }, [report.placeId])

  const handleResolve = async () => {
    setLoading(true)
    try {
      await updateReport(report.id!, { status: "resolved" })
      onUpdate({ ...report, status: "resolved" })
      setResolveDialogOpen(false)
    } catch (error) {
      console.error("Error resolving report:", error)
    } finally {
      setLoading(false)
    }
  }

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "inaccurate":
        return "Inaccurate Information"
      case "sensitive":
        return "Sensitive Content"
      case "duplicate":
        return "Duplicate Place"
      case "other":
        return "Other"
      default:
        return reason
    }
  }

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case "inaccurate":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "sensitive":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "duplicate":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "other":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Report #{report.id?.slice(-6)}
            </CardTitle>
            <div className="flex gap-2">
              <Badge className={getReasonColor(report.reason)}>{getReasonLabel(report.reason)}</Badge>
              <Badge variant={report.status === "pending" ? "destructive" : "secondary"}>
                {report.status === "pending" ? "Pending" : "Resolved"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Place Info */}
          {place && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium">{place.title}</h4>
                <Badge variant="outline">{place.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{place.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {place.municipality}, {place.suco}
              </p>
            </div>
          )}

          {/* Report Details */}
          <div>
            <h5 className="font-medium mb-2">Report Details</h5>
            <p className="text-sm text-muted-foreground">{report.details}</p>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            <p>Reported: {report.createdAt.toDate().toLocaleDateString()}</p>
            <p>Reporter ID: {report.reporterId.slice(-8)}</p>
          </div>

          {/* Actions */}
          {report.status === "pending" && (
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/places/${report.placeId}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Place
                </Link>
              </Button>

              <Button size="sm" onClick={() => setResolveDialogOpen(true)} disabled={loading}>
                <Check className="h-4 w-4 mr-2" />
                Mark Resolved
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Report</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this report as resolved? This action indicates that the issue has been reviewed and addressed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Resolved
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
