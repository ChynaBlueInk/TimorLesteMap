// app/places/[id]/page.tsx
"use client"

import {useEffect, useState} from "react"
import {useParams} from "next/navigation"
import {getPlace, type Place} from "@/lib/firestore"
import Navigation from "@/components/Navigation"
import MapView from "@/components/MapView"
import Reviews from "@/components/Reviews"
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Loader2, MapPin, Calendar} from "lucide-react"

export default function PlaceDetailPage(){
  const params = useParams()
  const placeId = params.id as string

  const [place, setPlace] = useState<Place|null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|undefined>(undefined)

  useEffect(()=>{
    let cancelled = false
    const run = async ()=>{
      setLoading(true); setError(undefined)
      try{
        const p = await getPlace(placeId)
        if(!cancelled) setPlace(p||null)
        if(!cancelled && !p) setError("Place not found.")
      }catch(err:any){
        if(!cancelled) setError(err?.message||"Failed to load place.")
      }finally{
        if(!cancelled) setLoading(false)
      }
    }
    if(placeId) run()
    return ()=>{ cancelled = true }
  },[placeId])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error || !place ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{error||"Place not found."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl font-bold">{place.title}</h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{place.category}</Badge>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {place.municipality}{place.suco?`, ${place.suco}`:""}
                  </span>
                  {place.period && (place.period.fromYear||place.period.toYear) && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {place.period.fromYear && place.period.toYear
                        ? `${place.period.fromYear}–${place.period.toYear}`
                        : place.period.fromYear
                          ? `From ${place.period.fromYear}`
                          : `Until ${place.period.toYear}`}
                    </span>
                  )}
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="h-[360px]">
                    <MapView
                      places={[place]}
                      center={{lat: place.coords.lat, lng: place.coords.lng}}
                      zoom={14}
                      showUserLocation={false}
                      showControls={false}
                      className="h-full"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-muted-foreground">{place.description}</p>
                </CardContent>
              </Card>

              <Reviews placeId={place.id} />
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Sources</h3>
                  {Array.isArray(place.sources)&&place.sources.length>0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {place.sources.map((s,idx)=>(
                        <li key={idx}>
                          <a href={s} target="_blank" rel="noreferrer" className="text-primary underline">{s}</a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sources listed.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
