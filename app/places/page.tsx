"use client"

import {useEffect, useState} from "react"
import Link from "next/link"
import {getPlaces, type Place} from "@/lib/firestore"
import Navigation from "@/components/Navigation"
import PlaceCard from "@/components/PlaceCard"
import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {Loader2, MapPin} from "lucide-react"
import {useTranslation, type Language} from "@/lib/i18n"

export default function PlacesPage(){
  const [language, setLanguage] = useState<Language>("en")
  const {t} = useTranslation(language)

  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|undefined>(undefined)

  useEffect(()=>{
    let cancelled = false
    const load = async ()=>{
      setLoading(true); setError(undefined)
      try{
        const all = await getPlaces() // ✅ no arguments
        if(!cancelled) setPlaces(all)
      }catch(err:any){
        if(!cancelled) setError(err?.message||"Failed to load places")
      }finally{
        if(!cancelled) setLoading(false)
      }
    }
    load()
    return ()=>{ cancelled = true }
  },[])

  return (
    <div className="min-h-screen bg-background">

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t("nav.map") || "Places"}</h1>
            <p className="text-muted-foreground">All places currently in the catalogue</p>
          </div>
          <Button asChild>
            <Link href="/submit">Submit a Place</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({length: 6}).map((_,i)=>(
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded mb-3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
              <div className="mt-4">
                <Button onClick={()=>location.reload()}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        ) : places.length===0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No places yet</h3>
              <p className="text-muted-foreground mb-4">Add the first place to get started.</p>
              <Button asChild variant="outline">
                <Link href="/submit">Submit a Place</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {places.map((place)=>(
              <PlaceCard
                key={place.id}
                place={place}
                onViewOnMap={(p)=>{ window.location.href = `/map?place=${p.id}` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
