"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker image paths don't resolve correctly through bundlers - use a plain
// inline SVG pin instead of fighting that well-known issue.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="#C1662F" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/>
  </svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const AMMAN: [number, number] = [31.9454, 35.9284];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPinPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const position: [number, number] = lat !== null && lng !== null ? [lat, lng] : AMMAN;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer center={position} zoom={12} style={{ height: "260px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        {lat !== null && lng !== null && <Marker position={[lat, lng]} icon={pinIcon} />}
      </MapContainer>
      <p className="bg-surface-secondary p-2 text-center text-xs text-ink-muted">
        Click the map to drop a pin at the delivery location.
      </p>
    </div>
  );
}
