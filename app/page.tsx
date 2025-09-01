// app/page.tsx
"use client"

import { useState, useEffect } from "react"
import { getPlaces, type Place } from "@/lib/firestore"
import { useTranslation, type Language } from "@/lib/i18n"
import Navigation from "@/components/Navigation"
import PlaceCard from "@/components/PlaceCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Map, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function HomePage(){
  const [language, setLanguage] = useState<Language>("en")
  const [featuredPlaces, setFeaturedPlaces] = useState<Place[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation(language)

  useEffect(()=>{
    const loadFeaturedPlaces = async ()=>{
      try{
        const all = await getPlaces()
        const featured = all
          .filter((p)=>p.featured===true && (p.status==="published" || !p.status))
          .slice(0, 6)
        setFeaturedPlaces(featured)
      }catch(err){
        console.error("Error loading featured places:", err)
      }finally{
        setLoading(false)
      }
    }
    loadFeaturedPlaces()
  },[])

  const handleSearch = ()=>{
    if(searchQuery.trim()){
      window.location.href = `/map?search=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} onLanguageChange={setLanguage} />

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">{t("home.title")}</h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 text-pretty">{t("home.subtitle")}</p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("home.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e)=>setSearchQuery(e.target.value)}
                  onKeyDown={(e)=>e.key==="Enter" && handleSearch()}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button onClick={handleSearch} size="lg" className="h-12 px-6">
                <Search className="h-4 w-4 mr-2" />
                {t("action.search")}
              </Button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href="/map">
                <Map className="h-5 w-5 mr-2" />
                {t("home.browseMap")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 bg-transparent">
              <Link href="/submit">
                <Plus className="h-5 w-5 mr-2" />
                {t("nav.submit")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Places */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">{t("home.featuredPlaces")}</h2>
            <Button asChild variant="ghost">
              <Link href="/map?featured=true">
                {t("action.viewAll")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({length:6}).map((_, i)=>(
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded mb-3"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredPlaces.length>0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPlaces.map((place)=>(
                <PlaceCard
                  key={place.id}
                  place={place}
                  onViewOnMap={(place)=>{
                    window.location.href = `/map?place=${place.id}`
                  }}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">{t("message.noResults")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">About Harii Timor</h2>
          <p className="text-lg text-muted-foreground mb-8 text-pretty">
            Harii Timor is a community-driven platform dedicated to preserving and sharing the rich history, culture,
            and stories of Timor-Leste. From ancient historical sites to vibrant cultural traditions, discover the
            places that make our nation unique.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Interactive Maps</h3>
              <p className="text-sm text-muted-foreground">Explore places across Timor-Leste with our interactive map interface</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Community Contributions</h3>
              <p className="text-sm text-muted-foreground">Share your own stories and knowledge about special places</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Rich Content</h3>
              <p className="text-sm text-muted-foreground">Discover detailed histories, photos, and cultural context</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
