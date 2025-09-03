// app/plan-trip/page.tsx
"use client"

import {useState} from "react"
import {useRouter} from "next/navigation"
import {useTranslation, type Language} from "@/lib/i18n"
import Navigation from "@/components/Navigation"
import TripPlanner from "@/components/TripPlanner"
import type {Trip} from "@/lib/trips"

export default function PlanTripPage(){
  const [language, setLanguage] = useState<Language>("en")
  // keep hook so the language switcher still works elsewhere
  useTranslation(language)
  const router = useRouter()

  const handleTripSaved = (trip: Trip)=>{
    router.push(`/trips/${trip.id}`)
  }

  const handleCancel = ()=>{
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Plan Your Trip</h1>
            <p className="text-muted-foreground">
              Create a personalized itinerary to explore the best places in Timor-Leste
            </p>
          </div>

          <TripPlanner language={language} onSave={handleTripSaved} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  )
}
