// app/submit/SubmitClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation, type Language } from "@/lib/i18n";
import PlaceForm from "@/components/PlaceForm";
import { Plus, Pencil } from "lucide-react";
import type { Place } from "@/lib/firestore";
import { getPlaces } from "@/lib/firestore";

export default function SubmitClient() {
  const [language] = useState<Language>("en");
  const { t } = useTranslation(language);
  const params = useSearchParams();
  const router = useRouter();

  const editId = params.get("edit");
  const [loading, setLoading] = useState<boolean>(!!editId);
  const [place, setPlace] = useState<Place | undefined>(undefined);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      setLoading(true);
      try {
        // Grab all and find the one we want (works regardless of status)
        const all = await getPlaces();
        const found = all.find((p) => p.id === editId);
        setPlace(found);
      } finally {
        setLoading(false);
      }
    })();
  }, [editId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              {editId ? (
                <>
                  <Pencil className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold">Edit Place</h1>
                </>
              ) : (
                <>
                  <Plus className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold">{t("nav.submit")}</h1>
                </>
              )}
            </div>
            {!editId ? (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Share a special place in Timor-Leste with our community. Your contribution helps
                preserve our history and culture for future generations.
              </p>
            ) : null}
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-10">Loading…</p>
          ) : (
            <PlaceForm
              language={language}
              place={place}
              onCancel={() => (editId ? router.push(`/places/${editId}`) : router.push("/"))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
