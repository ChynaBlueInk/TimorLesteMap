"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Copy, Check } from "lucide-react"

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
})

interface LocationPickerProps {
  coords: { lat: number; lng: number }
  onCoordsChange: (coords: { lat: number; lng: number }) => void
  disabled?: boolean
}

function LocationMarker({ coords, onCoordsChange, disabled }: LocationPickerProps) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onCoordsChange({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        })
      }
    },
  })

  return coords.lat !== 0 && coords.lng !== 0 ? <Marker position={[coords.lat, coords.lng]} /> : null
}

export default function LocationPicker({ coords, onCoordsChange, disabled = false }: LocationPickerProps) {
  const [isClient, setIsClient] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleLatChange = (value: string) => {
    const lat = Number.parseFloat(value)
    if (!isNaN(lat)) {
      onCoordsChange({ ...coords, lat })
    }
  }

  const handleLngChange = (value: string) => {
    const lng = Number.parseFloat(value)
    if (!isNaN(lng)) {
      onCoordsChange({ ...coords, lng })
    }
  }

  const copyCoordinates = async () => {
    const coordsText = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
    try {
      await navigator.clipboard.writeText(coordsText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy coordinates:", error)
    }
  }

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onCoordsChange({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {disabled ? "Location coordinates" : "Click on the map to set the location"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map */}
        <div className="h-64 rounded-lg overflow-hidden">
          <MapContainer
            center={coords.lat !== 0 && coords.lng !== 0 ? [coords.lat, coords.lng] : [-8.8742, 125.7275]}
            zoom={coords.lat !== 0 && coords.lng !== 0 ? 15 : 10}
            className="h-full w-full"
            zoomControl={!disabled}
            dragging={!disabled}
            scrollWheelZoom={!disabled}
            doubleClickZoom={!disabled}
            touchZoom={!disabled}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker coords={coords} onCoordsChange={onCoordsChange} disabled={disabled} />
          </MapContainer>
        </div>

        {/* Coordinate Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={coords.lat || ""}
              onChange={(e) => handleLatChange(e.target.value)}
              placeholder="-8.8742"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={coords.lng || ""}
              onChange={(e) => handleLngChange(e.target.value)}
              placeholder="125.7275"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!disabled && (
            <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation}>
              <MapPin className="h-4 w-4 mr-2" />
              Use My Location
            </Button>
          )}

          {coords.lat !== 0 && coords.lng !== 0 && (
            <Button type="button" variant="outline" size="sm" onClick={copyCoordinates}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Coordinates
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
