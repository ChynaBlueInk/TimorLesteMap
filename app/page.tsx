// app/page.tsx
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { getPlaces, type Place } from "@/lib/firestore"
import { useTranslation, type Language } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Map, Plus, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

type GalleryItem = { src: string; placeId: string; title: string }

export default function HomePage(){
  const [language, setLanguage] = useState<Language>("en")
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const { t } = useTranslation(language)
  const router = useRouter()

  useEffect(()=>{
    const load = async ()=>{
      try{
        const all = await getPlaces()
        const published = all.filter((p)=>p.status==="published" || !p.status)
        setPlaces(published)
      }catch(err){
        console.error("Error loading places for gallery:", err)
      }finally{
        setLoading(false)
      }
    }
    load()
  },[])

  // Build a lightweight gallery from place.images
  const gallery: GalleryItem[] = useMemo(()=>{
    const items: GalleryItem[] = []
    for(const p of places){
      if(Array.isArray(p.images)){
        for(const src of p.images){
          if(typeof src === "string" && src.trim()){
            items.push({ src, placeId: p.id, title: p.title })
          }
        }
      }
    }
    // Sort newest first (by updatedAt/createdAt)
    items.sort((a, b)=>{
      const pa = places.find(p=>p.id===a.placeId)
      const pb = places.find(p=>p.id===b.placeId)
      const ta = (pa?.updatedAt ?? pa?.createdAt ?? 0)
      const tb = (pb?.updatedAt ?? pb?.createdAt ?? 0)
      return tb - ta
    })
    // Cap to keep homepage snappy
    return items.slice(0, 20)
  }, [places])

  const handleSearch = ()=>{
    const q = searchQuery.trim()
    const dest = q ? `/map?q=${encodeURIComponent(q)}` : "/map"
    window.location.href = dest
  }

  // --- Carousel state/logic ---
  const [index, setIndex] = useState(0)
  const max = gallery.length
  const go = (delta: number) => {
    if(max === 0) return
    setIndex((i)=> (i + delta + max) % max)
  }

  // Auto-advance (pause on hover/focus)
  const [paused, setPaused] = useState(false)
  useEffect(()=>{
    if (paused || max <= 1) return
    const id = setInterval(()=> setIndex(i => (i + 1) % max), 5000)
    return ()=> clearInterval(id)
  }, [paused, max])

  // Touch swipe
  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    const threshold = 30
    if (dx > threshold) go(-1)
    else if (dx < -threshold) go(1)
  }

  // Keyboard arrows + open on Enter/Space
  const sliderRef = useRef<HTMLDivElement>(null)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1) }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1) }
    if ((e.key === "Enter" || e.key === " ") && gallery[index]) {
      e.preventDefault()
      router.push(`/places/${gallery[index].placeId}`)
    }
  }

  // Preload neighbors for smoother browsing
  useEffect(()=>{
    if (max <= 1) return
    const preload = (i: number) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = gallery[i].src
    }
    preload((index + 1) % max)
    preload((index - 1 + max) % max)
  }, [index, max, gallery])

  const currentPlace = useMemo(
    () => places.find(p => p.id === gallery[index]?.placeId),
    [places, gallery, index]
  )

  return (
    <div className="min-h-screen bg-background">

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

      {/* Image Carousel (replaces Featured Places) */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl font-bold">Gallery</h2>
            <Button asChild variant="ghost">
              <Link href="/map">
                {t("action.viewAll")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({length:12}).map((_, i)=>(
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-lg" />
                </Card>
              ))}
            </div>
          ) : (gallery.length > 0 ? (
            <div
              ref={sliderRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              onMouseEnter={()=>setPaused(true)}
              onMouseLeave={()=>setPaused(false)}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="relative mx-auto max-w-5xl select-none outline-none"
              aria-roledescription="carousel"
              aria-label="Place photo gallery"
            >
              {/* Slide (clickable container, NOT a nested link) */}
              <div
                role="button"
                aria-label={`Open ${gallery[index].title}`}
                className="group overflow-hidden rounded-2xl shadow-sm cursor-pointer"
                onClick={()=>router.push(`/places/${gallery[index].placeId}`)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`${gallery[index].placeId}-${index}`}
                  src={gallery[index].src}
                  alt={gallery[index].title || `Gallery image ${index+1}`}
                  className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  draggable={false}
                  loading="eager"
                  crossOrigin="anonymous"
                  onError={(e)=>{
                    (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-3 flex items-end justify-between gap-3 px-4">
                  <div className="pointer-events-none text-white drop-shadow">
                    <div className="line-clamp-1 text-lg font-semibold">
                      {gallery[index].title}
                    </div>
                    {currentPlace && (
                      <div className="line-clamp-1 text-sm opacity-90">
                        {currentPlace.municipality}
                        {currentPlace.suco ? `, ${currentPlace.suco}` : ""}
                      </div>
                    )}
                  </div>
                  <Button asChild size="sm" variant="secondary" className="pointer-events-auto">
                    <Link href={`/places/${gallery[index].placeId}`}>View place</Link>
                  </Button>
                </div>
              </div>

              {/* Arrows */}
              {max > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={()=>go(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={()=>go(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Dots */}
              {max > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {gallery.map((_, i)=>(
                    <button
                      key={i}
                      aria-label={`Go to slide ${i+1}`}
                      onClick={()=>setIndex(i)}
                      className={`h-2 w-2 rounded-full transition-opacity ${i===index ? "bg-primary opacity-100" : "bg-muted-foreground/40 opacity-60"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">{t("message.noResults")}</p>
              </CardContent>
            </Card>
          ))}
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
