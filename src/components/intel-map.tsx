"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix for default marker icons in Leaflet + Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface IntelMapProps {
  points: any[];
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function IntelMap({ points }: IntelMapProps) {
  const center: [number, number] = points.length > 0 
    ? [points[0].lat, points[0].lng] 
    : [0, 0];
  
  const zoom = points.length > 0 ? 12 : 2;

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: "100%", width: "100%", background: "#050505" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {points.map((p) => (
        <Marker 
          key={p.id} 
          position={[p.lat, p.lng]}
          icon={L.divIcon({
            className: "custom-marker",
            html: `<div style="
              width: 12px; 
              height: 12px; 
              background: ${p.isSuspicious ? "#EF4444" : "#594DFF"}; 
              border-radius: 50%; 
              box-shadow: 0 0 10px ${p.isSuspicious ? "#EF4444" : "#594DFF"};
              border: 2px solid #fff;
            "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })}
        >
          <Popup>
            <div style={{ color: "#000", fontSize: "12px" }}>
              <strong>{p.name}</strong><br />
              Type: {p.type}
            </div>
          </Popup>
        </Marker>
      ))}
      {points.length > 0 && <ChangeView center={center} zoom={zoom} />}
    </MapContainer>
  );
}
