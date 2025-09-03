// app/submit/SubmitClient.tsx
"use client";

import { useState } from "react";
import { useTranslation, type Language } from "@/lib/i18n";
import PlaceForm from "@/components/PlaceForm";
import { Plus } from "lucide-react";

export default function SubmitClient() {
  const [language] = useState<Language>("en");
  const { t } = useTranslation(language);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Plus className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{t("nav.submit")}</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Share a special place in Timor-Leste with our community. Your contribution helps
              preserve our history and culture for future generations.
            </p>
          </div>

          {/* If PlaceForm needs auth, it should show its own "please sign in" note. */}
          <PlaceForm language={language} />
        </div>
      </div>
    </div>
  );
}
