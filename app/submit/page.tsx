// app/submit/page.tsx
"use client"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"


import { useState } from "react"
import { useTranslation, type Language } from "@/lib/i18n"
import Navigation from "@/components/Navigation"
import PlaceForm from "@/components/PlaceForm"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Plus } from "lucide-react"

export default function SubmitPage() {
  const [language, setLanguage] = useState<Language>("en")
  const { t } = useTranslation(language)

  return (
    <ProtectedRoute requireAuth>
      <div className="min-h-screen bg-background">
        <Navigation language={language} onLanguageChange={setLanguage} />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Plus className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">{t("nav.submit")}</h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Share a special place in Timor-Leste with our community. Your contribution helps preserve our history and
                culture for future generations.
              </p>
            </div>

            <PlaceForm language={language} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
