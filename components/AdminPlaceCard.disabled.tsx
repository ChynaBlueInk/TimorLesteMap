// components/AdminReportCard.tsx
"use client";

import { useEffect, useState } from "react";
import type { Place, Report } from "@/lib/firestore";
import { getPlace, resolveReport, updateReport } from "@/lib/firestore";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flag, Check, X, Eye } from "lucide-react";
import Link from "next/link";

interface AdminReportCardProps {
  report: Report;
  /** Called after the report status changes (e.g., resolved) so the parent can refresh */
  onStatusChange?: (reportId: string, next: Report) => void;
}

export default function AdminReportCard({ report, onStatusChange }: AdminReportCardProps) {
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await getPlace(report.placeId);
        if (!cancelled) setPlace(p ?? null); // ✅ coerce undefined → null
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report.placeId]);

  const statusColors = {
    open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  } as const;

  async function markResolved() {
    setUpdating(true);
    try {
      // keep both helpers so either implementation works
      await resolveReport(report.id);
      const next: Report = { ...report, status: "resolved" };
      await updateReport(report.id, { status: "resolved" });
      onStatusChange?.(report.id, next);
    } catch (e) {
      console.error("Failed to resolve report:", e);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-600" />
            <h3 className="text-lg font-semibold leading-tight">Report</h3>
          </div>
          <Badge className={statusColors[report.status]}>{report.status}</Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Reason:</span> {report.reason}
          </div>
          {report.details ? (
            <div>
              <span className="font-medium">Details:</span> {report.details}
            </div>
          ) : null}
          <div>
            <span className="font-medium">Place ID:</span> {report.placeId}
          </div>
          <div className="text-muted-foreground">
            Created: {new Date(report.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading place…
            </div>
          ) : place ? (
            <div className="rounded-md border p-3">
              <div className="mb-1 text-sm text-muted-foreground">Reported place</div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{place.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {place.municipality}
                    {place.suco ? `, ${place.suco}` : ""}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/places/${place.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Place not found (it may have been deleted).
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 p-4 pt-0">
        {report.status !== "resolved" ? (
          <>
            <Button size="sm" onClick={markResolved} disabled={updating}>
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Mark Resolved
            </Button>
            <Button size="sm" variant="outline" asChild disabled={!place}>
              <Link href={place ? `/places/${place.id}` : "#"}>
                <Eye className="mr-2 h-4 w-4" />
                View Place
              </Link>
            </Button>
          </>
        ) : (
          <div className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <Check className="h-4 w-4" />
            Resolved
          </div>
        )}

        {/* Optional: mark pending */}
        {report.status === "open" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              setUpdating(true);
              try {
                const next: Report = { ...report, status: "pending" };
                await updateReport(report.id, { status: "pending" });
                onStatusChange?.(report.id, next);
              } finally {
                setUpdating(false);
              }
            }}
            disabled={updating}
          >
            {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
            Mark Pending
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
