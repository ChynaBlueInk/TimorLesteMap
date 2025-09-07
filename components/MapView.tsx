// components/MapView.tsx
"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L, { LatLngLiteral, Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { Place } from "@/lib/firestore";

// Leaflet default icon fix (so markers show)
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: (markerIcon as unknown as { src?: string }).src ?? (markerIcon as unknown as string),
  iconRetinaUrl: (marker2x as unknown as { src?: string }).src ?? (marker2x as unknown as string),
  shadowUrl: (markerShadow as unknown as { src?: string }).src ?? (markerShadow as unknown as string),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type MapPlace = Place & { distance?: number };

type Props = {
  places: MapPlace[];
  center?: LatLngLiteral;
  zoom?: number;
  onPlaceClick?: (place: Place) => void;
  onDelete?: (place: Place) => Promise<void> | void;
  getImageSrc?: (img: unknown) => string | undefined;
  className?: string;
  attributionControl?: boolean;
  zoomControl?: boolean;
};

type MarkerWithPreview = MapPlace & { _preview?: string };

const DEFAULT_CENTER: LatLngLiteral = { lat: -8.5586, lng: 125.5736 }; // Dili

function isValidLatLng(val?: LatLngLiteral): val is LatLngLiteral {
  return !!val && Number.isFinite(val.lat) && Number.isFinite(val.lng);
}

/** derive coordinates from any of the shapes your data might have */
function coordsOf(p: Partial<MapPlace>): LatLngLiteral | undefined {
  const c = (p as any).coords as LatLngLiteral | undefined;
  if (isValidLatLng(c)) return c;

  const lat1 = (p as any).lat ?? (p as any).latitude;
  const lng1 =
    (p as any).lng ??
    (p as any).lon ??
    (p as any).long ??
    (p as any).longitude;

  if (Number.isFinite(lat1) && Number.isFinite(lng1)) {
    return { lat: Number(lat1), lng: Number(lng1) };
  }

  const loc = (p as any).location || {};
  const lat2 = loc.lat ?? loc.latitude;
  const lng2 = loc.lng ?? loc.lon ?? loc.long ?? loc.longitude;
  if (Number.isFinite(lat2) && Number.isFinite(lng2)) {
    return { lat: Number(lat2), lng: Number(lng2) };
  }

  return undefined;
}
// ^^^ OOPS small typo sneaked in. Correct line:
/// return { lat: Number(lat2), lng: Number(lng2) };

function normalizeImageSrc(
  images: unknown[] | undefined,
  getImageSrc?: (img: unknown) => string | undefined
): string | undefined {
  if (!images || images.length === 0) return undefined;
  const first = images[0];
  if (getImageSrc) {
    const custom = getImageSrc(first);
    if (custom) return custom;
  }
  if (typeof first === "string") return first;
  if (typeof window !== "undefined" && typeof File !== "undefined" && first instanceof File) {
    return URL.createObjectURL(first);
  }
  return undefined;
}

function Recenter({ center, zoom = 10 }: { center: LatLngLiteral; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!isValidLatLng(center)) return;
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapView({
  places,
  center,
  zoom = 10,
  onPlaceClick,
  onDelete,
  getImageSrc,
  className,
  attributionControl = false,
  zoomControl = true,
}: Props) {
  const resolvedCenter = useMemo<LatLngLiteral>(() => {
    if (isValidLatLng(center)) return center;
    const firstWithCoords = coordsOf(places[0] || {});
    if (isValidLatLng(firstWithCoords)) return firstWithCoords;
    return DEFAULT_CENTER;
  }, [center, places]);

  const markers: (MarkerWithPreview & { coords: LatLngLiteral })[] = useMemo(() => {
    const out: (MarkerWithPreview & { coords: LatLngLiteral })[] = [];
    for (const p of places) {
      const coords = coordsOf(p);
      if (!coords) continue;
      const img = normalizeImageSrc(p.images as unknown[] | undefined, getImageSrc);
      out.push({ ...(p as any), coords, _preview: img });
    }
    return out;
  }, [places, getImageSrc]);

  useEffect(() => {
    const blobUrls = markers
      .map((m) => m._preview)
      .filter((src): src is string => typeof src === "string" && src.startsWith("blob:"));
    return () => {
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [markers]);

  return (
    <div className={className ?? "relative w-full h-full"}>
      <MapContainer
        center={resolvedCenter}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={zoomControl}
        attributionControl={attributionControl}
      >
        <Recenter center={resolvedCenter} zoom={zoom} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />

        {markers.map((place) => {
          const icon: Icon = DefaultIcon;
          return (
            <Marker
              key={place.id}
              position={place.coords}
              icon={icon}
              eventHandlers={{
                click: () => onPlaceClick?.(place),
              }}
            >
              <Popup minWidth={280}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{place.title}</h3>
                    {place.distance !== undefined ? (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {place.distance.toFixed(1)} km
                      </Badge>
                    ) : null}
                  </div>

                  {place._preview ? (
                    <img
                      src={place._preview}
                      alt={place.title}
                      className="h-28 w-full rounded object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="h-28 w-full rounded bg-muted" />
                  )}

                  {place.description ? (
                    <p className="line-clamp-3 text-xs text-muted-foreground">{place.description}</p>
                  ) : null}

                  <div className="flex gap-2 pt-1">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/places/${place.id}`}>View</Link>
                    </Button>

                    <Button variant="secondary" size="sm" className="gap-1" asChild>
                      <Link href={`/submit?edit=${place.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>

                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={async () => {
                          const ok = window.confirm(`Delete "${place.title}"? This cannot be undone.`);
                          if (!ok) return;
                          await onDelete(place);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
