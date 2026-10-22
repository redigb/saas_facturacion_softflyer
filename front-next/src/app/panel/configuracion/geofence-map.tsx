"use client";

import { useEffect, useState } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { Icon } from "@/components/icons";
import { Button, Input } from "@/components/ui";

export type GeofenceValue = { latitud: number; longitud: number; radio_metros: number };

const LIMA: [number, number] = [-12.0464, -77.0428];

export default function GeofenceMap({ value, onChange }: { value: GeofenceValue | null; onChange: (value: GeofenceValue | null) => void }) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const center: [number, number] = value ? [value.latitud, value.longitud] : LIMA;

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocationError("Este dispositivo no permite obtener la ubicación.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({ latitud: coords.latitude, longitud: coords.longitude, radio_metros: value?.radio_metros ?? 60 });
        setLocating(false);
      },
      () => {
        setLocationError("No pudimos obtener tu ubicación. Activa el GPS o toca el punto exacto en el mapa.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-niebla">
        <MapContainer center={center} zoom={value ? 18 : 12} className="h-72 w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClick value={value} onChange={onChange} />
          <MapCenter center={center} />
          {value ? (
            <>
              <Circle center={center} radius={value.radio_metros} pathOptions={{ color: "var(--color-azul)", fillColor: "var(--color-celeste)", fillOpacity: 0.16 }} />
              <CircleMarker center={center} radius={7} pathOptions={{ color: "var(--color-azul-oscuro)", fillColor: "var(--color-azul)", fillOpacity: 1 }} />
            </>
          ) : null}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={locate} isLoading={locating}>
          <Icon name="ubicacion" className="h-4 w-4" />
          Usar mi ubicación
        </Button>
        {value ? (
          <Button variant="ghost" onClick={() => onChange(null)} className="text-red-600">
            Quitar geocerca
          </Button>
        ) : null}
      </div>

      {value ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
          <Input
            aria-label="Latitud"
            type="number"
            step="0.0000001"
            value={value.latitud}
            onChange={(event) => onChange({ ...value, latitud: Number(event.target.value) })}
            className="tabular-nums"
          />
          <Input
            aria-label="Longitud"
            type="number"
            step="0.0000001"
            value={value.longitud}
            onChange={(event) => onChange({ ...value, longitud: Number(event.target.value) })}
            className="tabular-nums"
          />
          <label className="text-sm font-bold text-tinta">
            Radio (m)
            <Input
              aria-label="Radio de geocerca en metros"
              type="number"
              min={20}
              max={500}
              value={value.radio_metros}
              onChange={(event) => onChange({ ...value, radio_metros: Number(event.target.value) })}
              className="mt-1 tabular-nums"
            />
          </label>
        </div>
      ) : (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Toca el restaurante en el mapa o usa tu ubicación estando dentro del local.
        </p>
      )}
      {locationError ? <p className="text-sm font-semibold text-red-600">{locationError}</p> : null}
    </div>
  );
}

function MapClick({ value, onChange }: { value: GeofenceValue | null; onChange: (value: GeofenceValue) => void }) {
  useMapEvents({
    click: ({ latlng }) => onChange({ latitud: latlng.lat, longitud: latlng.lng, radio_metros: value?.radio_metros ?? 60 }),
  });
  return null;
}

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

