// components/TripRouteMap.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { LatLngExpression, LatLngTuple, Icon, LatLngBoundsExpression } from "leaflet";

// Leaflet default icon fix (so markers render in Next.js)
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon: Icon = L.icon({
  iconUrl: (markerIcon as any).src ?? (markerIcon as unknown as string),
  iconRetinaUrl: (marker2x as any).src ?? (marker2x as unknown as string),
  shadowUrl: (markerShadow as any).src ?? (markerShadow as unknown as string),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type StopMarker = {
  id: string;
  title: string;
  coords: { lat: number; lng: number };
  photoUrl?: string;
  notes?: string;
};

type Props = {
  waypoints: { lat: number; lng: number }[];
  transportMode: "car" | "motorbike" | "scooter" | "bus" | "bicycle" | "walking";
  /** Optional: pass for photo popups; if omitted we’ll still render simple pins from waypoints */
  markers?: StopMarker[];
  className?: string;
};

// Keeps the map view fitted to all points
function FitAll({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [bounds, map]);
  return null;
}

export default function TripRouteMap({ waypoints, transportMode, markers = [], className }: Props) {
  const [route, setRoute] = useState<LatLngTuple[] | null>(null);

  const profile =
    transportMode === "walking" ? "foot" : transportMode === "bicycle" ? "cycling" : "driving";

  // Build a unified list of points to show (for bounds & fallback markers)
  const allPoints = useMemo<LatLngTuple[]>(() => {
    if (markers.length > 0) {
      return markers.map((m) => [m.coords.lat, m.coords.lng]);
    }
    if (waypoints.length > 0) {
      return waypoints.map((w) => [w.lat, w.lng]);
    }
    // Default to Dili if nothing to show
    return [[-8.5586, 125.5736]];
  }, [markers, waypoints]);

  // Bounds for fitting all pins/waypoints
  const bounds = useMemo<LatLngBoundsExpression>(() => {
    if (allPoints.length === 1) {
      // Single point — make a tiny box so fitBounds still zooms in nicely
      const [lat, lng] = allPoints[0];
      return [
        [lat - 0.02, lng - 0.02],
        [lat + 0.02, lng + 0.02],
      ];
    }
    return L.latLngBounds(allPoints as LatLngTuple[]);
  }, [allPoints]);

  // Try to fetch a roads-following route; fall back to straight lines if it fails
  useEffect(() => {
    let cancelled = false;
    setRoute(null);

    if (waypoints.length < 2) return;

    const path = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson&steps=false`;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const coords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates ?? [];
        const latlngs: LatLngTuple[] = coords.map(([lng, lat]) => [lat, lng]);
        if (!cancelled) setRoute(latlngs);
      } catch {
        if (!cancelled) setRoute(null); // will render straight lines
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [waypoints, profile]);

  // Fallback “synthetic” markers from waypoints when no markers were passed
  const fallbackMarkers: StopMarker[] = useMemo(() => {
    if (markers.length > 0) return markers;
    return waypoints.map((w, i) => ({
      id: `wp-${i}`,
      title: `Stop ${i + 1}`,
      coords: { lat: w.lat, lng: w.lng },
    }));
  }, [markers, waypoints]);

  return (
    <div className={className ?? "relative w-full h-full"}>
      <MapContainer
        center={allPoints[0]}
        zoom={8}
        className="h-full w-full"
        attributionControl={false}
        zoomControl={true}
      >
        <FitAll bounds={bounds} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Pins */}
        {fallbackMarkers.map((m) => (
          <Marker key={m.id} position={[m.coords.lat, m.coords.lng]}>
            <Popup minWidth={280}>
              <div className="space-y-2">
                <h3 className="font-semibold leading-tight">{m.title || "Stop"}</h3>
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoUrl}
                    alt={m.title || "Stop photo"}
                    className="h-28 w-full rounded object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-28 w-full rounded bg-muted" />
                )}
                {m.notes ? <p className="text-xs text-muted-foreground">{m.notes}</p> : null}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route (roads-following if available; else straight lines) */}
        {route ? (
          <Polyline positions={route} />
        ) : waypoints.length >= 2 ? (
          <Polyline positions={waypoints.map((w) => [w.lat, w.lng]) as LatLngTuple[]} />
        ) : null}
      </MapContainer>
    </div>
  );
}
