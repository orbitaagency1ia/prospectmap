"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMapEvents } from "react-leaflet";

import {
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  STATUS_META,
  type ProspectStatus,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type MapMarker = {
  key: string;
  lat: number;
  lng: number;
  name: string;
  category: string | null;
  score: number;
  serviceLabel: string;
  nextAction: string;
  status: ProspectStatus;
  worked: boolean;
  lastInteractionAt: string | null;
  latestNote: string | null;
};

type Props = {
  center: [number, number];
  markers: MapMarker[];
  selectedKey: string | null;
  onMarkerSelect: (key: string) => void;
  onBoundsChange: (bounds: MapBounds) => void;
};

const iconCache = new Map<string, L.DivIcon>();

function getMarkerIcon(status: ProspectStatus, worked: boolean) {
  const cacheKey = `${status}:${worked}`;
  const fromCache = iconCache.get(cacheKey);
  if (fromCache) return fromCache;

  const statusColor = STATUS_META[status].markerColor;

  const icon = L.divIcon({
    className: "prospectmap-marker",
    html: `<div style="
      width: 18px;
      height: 18px;
      border-radius: 999px;
      border: 2px solid rgba(15,23,42,0.95);
      background: ${statusColor};
      box-shadow: 0 0 0 ${worked ? "2px rgba(226,232,240,0.35)" : "0px"};
      position: relative;
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    },
    zoomend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    },
  });

  useEffect(() => {
    const bounds = map.getBounds();
    onBoundsChange({
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    });
  }, [map, onBoundsChange]);

  return null;
}

export function MapCanvas({
  center,
  markers,
  selectedKey,
  onMarkerSelect,
  onBoundsChange,
}: Props) {
  const mapKey = useMemo(() => `${center[0].toFixed(4)}-${center[1].toFixed(4)}`, [center]);

  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={MAP_DEFAULT_ZOOM}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      className="h-full w-full"
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <BoundsWatcher onBoundsChange={onBoundsChange} />

      <MarkerClusterGroup chunkedLoading>
        {markers.map((marker) => {
          const status = STATUS_META[marker.status];

          return (
            <Marker
              key={marker.key}
              position={[marker.lat, marker.lng]}
              icon={getMarkerIcon(marker.status, marker.worked)}
              eventHandlers={{
                click: () => onMarkerSelect(marker.key),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div className="min-w-[180px] space-y-1 text-xs">
                  <p className="font-semibold text-slate-50">{marker.name}</p>
                  <p className="text-slate-300">{marker.category ?? "Sin categoría"}</p>
                  <p className="text-cyan-200">Score: {marker.score}</p>
                  <p className="text-slate-300">Estado: {status.label}</p>
                  <p className="text-slate-300">Servicio: {marker.serviceLabel}</p>
                  <p className="text-slate-400">{marker.worked ? "Trabajado" : "Sin trabajar"}</p>
                  <p className="line-clamp-2 text-slate-400">
                    {marker.latestNote ? `Nota: ${marker.latestNote}` : `Última interacción: ${formatDateTime(marker.lastInteractionAt)}`}
                  </p>
                </div>
              </Tooltip>

              <Popup>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold">{marker.name}</p>
                  <p>{marker.category ?? "Sin categoría"}</p>
                  <p>Score {marker.score}</p>
                  <p>{status.label}</p>
                  <p>{marker.serviceLabel}</p>
                  <p>{marker.nextAction}</p>
                  <p>{marker.worked ? "Trabajado" : "Sin trabajar"}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>

      {selectedKey ? <span className="hidden" data-selected={selectedKey} /> : null}
    </MapContainer>
  );
}
