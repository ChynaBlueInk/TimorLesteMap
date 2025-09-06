"use client";

import { useState } from "react";
import { type Place, updatePlace } from "@/lib/firestore";
import { useTranslation, type Language } from "@/lib/i18n";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Star, StarOff, Eye, MapPin, Calendar, Loader2, Flag } from "lucide-react";
import Link from "next/link";

interface AdminPlaceCardProps {
  place: Place;
  onUpdate: (place: Place) => void;
  language?: Language;
}

export default function AdminPlaceCard({ place, onUpdate, language = "en" }: AdminPlaceCardProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "feature" | "unfeature" | null>(null);

  const handleAction = async () => {
    if (!actionType) return;

    setLoading(true);
    try {
      let updates: Partial<Place> = {};

      switch (actionType) {
        case "approve":
          updates = { status: "published" };
          break;
        case "reject":
          updates = { status: "flagged" };
          break;
        case "feature":
          updates = { featured: true };
          break;
        case "unfeature":
          updates = { featured: false };
          break;
      }

      await updatePlace(place.id!, updates);
      onUpdate({ ...place, ...updates });
      setActionDialogOpen(false);
      setActionType(null);
    } catch (error) {
      console.error("Error updating place:", error);
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (type: typeof actionType) => {
    setActionType(type);
    setActionDialogOpen(true);
  };

  const getActionText = () => {
    switch (actionType) {
      case "approve":
        return { title: "Approve Place", description: "This will publish the place and make it visible to all users." };
      case "reject":
        return { title: "Reject Place", description: "This will flag the place and hide it from public view." };
      case "feature":
        return {
          title: "Feature Place",
          description: "This will mark the place as featured and highlight it on the homepage.",
        };
      case "unfeature":
        return { title: "Unfeature Place", description: "This will remove the featured status from this place." };
      default:
        return { title: "", description: "" };
    }
  };

  const statusColors = {
    published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  } as const;
  const statusKey = (place.status ?? "published") as keyof typeof statusColors;
  const statusI18nKey = `status.${statusKey}` as any;

  const categoryColors = {
    history: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    culture: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    nature: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    food: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    memorials: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    other: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  } as const;
  const categoryKey = (place.category === "memorial" ? "memorials" : place.category) as keyof typeof categoryColors;
  const categoryI18nKey = `category.${categoryKey}` as any;

  return (
    <>
      <Card className="group">
        {place.images && place.images.length > 0 && (
          <div className="relative h-48 overflow-hidden rounded-t-lg">
            <img
              src={place.images[0] || "/placeholder.svg"}
              alt={place.title}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute left-2 top-2 flex gap-2">
              <Badge className={statusColors[statusKey]}>{t(statusI18nKey)}</Badge>
              {place.featured && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Star className="mr-1 h-3 w-3" />
                  Featured
                </Badge>
              )}
            </div>
          </div>
        )}

        <CardContent className="p-4">
          <div className="mb-2 flex items-start justify-between">
            <h3 className="text-lg font-semibold leading-tight transition-colors group-hover:text-primary">
              {place.title}
            </h3>
            <Badge className={categoryColors[categoryKey]}>{t(categoryI18nKey)}</Badge>
          </div>

          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{place.description}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {place.municipality}, {place.suco}
              </span>
            </div>

            {place.period && (place.period.fromYear || place.period.toYear) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {place.period.fromYear && place.period.toYear
                    ? `${place.period.fromYear} - ${place.period.toYear}`
                    : place.period.fromYear
                    ? `From ${place.period.fromYear}`
                    : `Until ${place.period.toYear}`}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 p-4 pt-0">
          <Button asChild variant="outline" size="sm">
            <Link href={`/places/${place.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </Button>

          {place.status === "pending" && (
            <>
              <Button size="sm" onClick={() => openActionDialog("approve")} disabled={loading}>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="destructive" size="sm" onClick={() => openActionDialog("reject")} disabled={loading}>
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          {place.status === "published" && (
            <>
              {place.featured ? (
                <Button variant="outline" size="sm" onClick={() => openActionDialog("unfeature")} disabled={loading}>
                  <StarOff className="mr-2 h-4 w-4" />
                  Unfeature
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => openActionDialog("feature")} disabled={loading}>
                  <Star className="mr-2 h-4 w-4" />
                  Feature
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => openActionDialog("reject")} disabled={loading}>
                <Flag className="mr-2 h-4 w-4" />
                Flag
              </Button>
            </>
          )}

          {place.status === "flagged" && (
            <Button size="sm" onClick={() => openActionDialog("approve")} disabled={loading}>
              <Check className="mr-2 h-4 w-4" />
              Restore
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionText().title}</AlertDialogTitle>
            <AlertDialogDescription>{getActionText().description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
