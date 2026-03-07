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
import { formatCurrency, formatDateTime } from "@/lib/utils";

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
  opportunityLabel: string;
  serviceLabel: string;
  urgency: "alta" | "media" | "baja";
  nextAction: string;
  estimatedValue: number;
  attentionLabel: string;
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
                <div className="min-w-[220px] space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--pm-text)]">{marker.name}</p>
                      <p className="text-[var(--pm-text-secondary)]">{marker.category ?? "Sin categoría"}</p>
                    </div>
                    <span className="rounded-full border border-[rgba(242,138,46,0.5)] bg-[rgba(242,138,46,0.12)] px-2 py-1 text-[rgba(255,214,179,0.98)]">
                      {marker.score}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--pm-border)] px-2 py-1 text-[var(--pm-text-secondary)]">{marker.opportunityLabel}</span>
                    <span className="rounded-full border border-[var(--pm-border)] px-2 py-1 text-[var(--pm-text-secondary)]">{status.label}</span>
                    <span className="rounded-full border border-[var(--pm-border)] px-2 py-1 text-[var(--pm-text-secondary)]">Urgencia {marker.urgency}</span>
                  </div>
                  <p className="text-[var(--pm-text-secondary)]">Servicio: {marker.serviceLabel}</p>
                  <p className="text-[var(--pm-text-secondary)]">Valor estimado: {formatCurrency(marker.estimatedValue)}</p>
                  <p className="text-[var(--pm-text-tertiary)]">{marker.worked ? "Trabajado" : "Sin trabajar"}</p>
                  <p className="line-clamp-2 text-[var(--pm-text-tertiary)]">
                    {marker.latestNote
                      ? `Nota: ${marker.latestNote}`
                      : `${marker.attentionLabel} · ${formatDateTime(marker.lastInteractionAt)}`}
                  </p>
                </div>
              </Tooltip>

              <Popup>
                <div className="min-w-[220px] space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{marker.name}</p>
                      <p>{marker.category ?? "Sin categoría"}</p>
                    </div>
                    <span className="rounded-full border border-[rgba(242,138,46,0.5)] bg-[rgba(242,138,46,0.12)] px-2 py-1 text-[rgba(255,214,179,0.98)]">
                      Prioridad {marker.score}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--pm-border)] px-2 py-1">{marker.opportunityLabel}</span>
                    <span className="rounded-full border border-[var(--pm-border)] px-2 py-1">{status.label}</span>
                  </div>
                  <p>{marker.serviceLabel}</p>
                  <p>{formatCurrency(marker.estimatedValue)}</p>
                  <p>{marker.nextAction}</p>
                  <p>{marker.attentionLabel}</p>
                  <button
                    type="button"
                    onClick={() => onMarkerSelect(marker.key)}
                    className="w-full rounded-lg border border-[rgba(242,138,46,0.5)] bg-[rgba(242,138,46,0.12)] px-3 py-2 text-left font-medium text-[rgba(255,221,188,0.98)]"
                  >
                    Abrir informe
                  </button>
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
