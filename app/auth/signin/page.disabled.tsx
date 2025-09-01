"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useTranslation, type Language } from "@/lib/i18n"
import Navigation from "@/components/Navigation"
import AuthForm from "@/components/AuthForm"
import { Loader2 } from "lucide-react"

function SignInContent() {
  const [language, setLanguage] = useState<Language>("en")
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const searchParams = useSearchParams()
  const { t } = useTranslation(language)

  const redirectTo = searchParams.get("redirect") || "/"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user as any)
      setLoading(false)

      // Redirect if already signed in
      if (user) {
        window.location.href = redirectTo
      }
    })

    return () => unsubscribe()
  }, [redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} onLanguageChange={setLanguage} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} onLanguageChange={setLanguage} />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t("auth.signIn")}</h1>
            <p className="text-muted-foreground">Sign in to share your own places and stories</p>
          </div>

          <AuthForm mode="signin" language={language} redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
