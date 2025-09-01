"use client"

import {useEffect, useState} from "react"
import {MapContainer, TileLayer, Marker, Popup, useMap} from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import L from "leaflet"
import type {Place} from "@/lib/firestore"
import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {MapPin, ExternalLink, Calendar, Navigation} from "lucide-react"

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
})

/**
 * Some parts of the app use "memorial" and others use "memorials".
 * To be robust, we support both keys here and map them to the same styling.
 */
const categoryIcons = {
  history: "🏛️",
  culture: "🎭",
  nature: "🌿",
  food: "🍽️",
  memorial: "🕊️",
  memorials: "🕊️",
  other: "📍",
} as const

const categoryColors = {
  history: "#8B5CF6",
  culture: "#F59E0B",
  nature: "#10B981",
  food: "#EF4444",
  memorial: "#6B7280",
  memorials: "#6B7280",
  other: "#3B82F6",
} as const

type CategoryKey = keyof typeof categoryIcons // "history" | "culture" | "nature" | "food" | "memorial" | "memorials" | "other"

const normalizeCategory = (cat: Place["category"]): CategoryKey=>{
  if(cat==="memorial") return "memorial"
  if((cat as any)==="memorials") return "memorials"
  return (cat as CategoryKey) in categoryIcons ? (cat as CategoryKey) : "other"
}

const createCustomIcon = (category: Place["category"])=>{
  const key = normalizeCategory(category)
  const color = categoryColors[key]
  const emoji = categoryIcons[key]

  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 14px;
        ">${emoji}</span>
      </div>
    `,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

const createUserLocationIcon = ()=>{
  return L.divIcon({
    html: `
      <div style="
        background: #3B82F6;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
      ">
        <div style="
          background: white;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: "user-location-marker",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

interface MapViewProps {
  places: Place[]
  center?: [number, number] | {lat: number, lng: number}
  zoom?: number
  onPlaceClick?: (place: Place)=>void
  showControls?: boolean
  showUserLocation?: boolean
  className?: string
  language?: string
}

function MapControls(){
  const map = useMap()

  const handleLocateMe = ()=>{
    if("geolocation" in navigator){
      navigator.geolocation.getCurrentPosition(
        (position)=>{
          const {latitude, longitude} = position.coords
          map.setView([latitude, longitude], 15)
        },
        (error)=>{
          console.error("Error getting location:", error)
        },
      )
    }
  }

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={handleLocateMe}
        className="bg-white/90 backdrop-blur-sm hover:bg-white"
        title="Find my location"
      >
        <Navigation className="h-4 w-4" />
      </Button>
    </div>
  )
}

function PlacePopup({place, onViewDetails}:{place: Place, onViewDetails?: (place: Place)=>void}){
  return (
    <Card className="w-64 border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-sm leading-tight">{place.title}</h3>
          <Badge variant="secondary" className="ml-2 text-xs">
            {place.category}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{place.description}</p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3 w-3" />
          <span>
            {place.municipality}{place.suco ? `, ${place.suco}` : ""}
          </span>
        </div>

        {place.period && (place.period.fromYear || place.period.toYear) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Calendar className="h-3 w-3" />
            <span>
              {place.period.fromYear && place.period.toYear
                ? `${place.period.fromYear} - ${place.period.toYear}`
                : place.period.fromYear
                  ? `From ${place.period.fromYear}`
                  : `Until ${place.period.toYear}`}
            </span>
          </div>
        )}

        {Array.isArray(place.images) && place.images.length>0 && (
          <div className="mb-3">
            <img
              src={place.images[0] || "/placeholder.svg"}
              alt={place.title}
              className="w-full h-24 object-cover rounded-md"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs bg-transparent"
            onClick={()=>onViewDetails?.(place)}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MapView({
  places,
  center = [-8.8742, 125.7275], // Dili, Timor-Leste
  zoom = 10,
  onPlaceClick,
  showControls = true,
  showUserLocation = false,
  className = "h-96",
  language = "en",
}: MapViewProps){
  const [isClient, setIsClient] = useState(false)

  useEffect(()=>{ setIsClient(true) }, [])

  if(!isClient){
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  const mapCenter: [number, number] = Array.isArray(center) ? center : [center.lat, center.lng]

  return (
    <div className={`${className} relative rounded-lg overflow-hidden`}>
      <MapContainer center={mapCenter} zoom={zoom} className="h-full w-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showUserLocation && !Array.isArray(center) && (
          <Marker position={[center.lat, center.lng]} icon={createUserLocationIcon()}>
            <Popup>
              <div className="text-center p-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Navigation className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Your Location</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        <MarkerClusterGroup chunkedLoading maxClusterRadius={50} spiderfyOnMaxZoom showCoverageOnHover={false}>
          {places.map((place)=>(
            <Marker
              key={place.id}
              position={[place.coords.lat, place.coords.lng]}
              icon={createCustomIcon(place.category)}
              eventHandlers={{ click: ()=>onPlaceClick?.(place) }}
            >
              <Popup>
                <PlacePopup place={place} onViewDetails={onPlaceClick} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {showControls && <MapControls />}
      </MapContainer>
    </div>
  )
}
