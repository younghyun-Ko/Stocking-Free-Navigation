"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { PRESET_PLACES } from "@/lib/presets";
import BottomSheet from "./BottomSheet";
import CctvDetail from "./CctvDetail";
import CctvMarkers, { type CctvFeature } from "./CctvMarkers";
import LightMarkers from "./LightMarkers";
import PoliceMarkers from "./PoliceMarkers";
import RouteLayer from "./RouteLayer";
import SearchBar from "./SearchBar";
import Toast from "./Toast";

// Next.js/Webpack 번들 환경에서 Leaflet 기본 마커 아이콘 경로가 깨지는 알려진 이슈 대응
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

const HYEHWA_CENTER: [number, number] = [37.586, 127.001];
const INITIAL_ZOOM = 16;

export default function MapView() {
  const [selected, setSelected] = useState<{ index: number; feature: CctvFeature } | null>(
    null
  );
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelect = useCallback((index: number, feature: CctvFeature) => {
    setSelected({ index, feature });
  }, []);

  const handleDeselect = useCallback(() => {
    setSelected(null);
  }, []);

  const handleSwap = useCallback(() => {
    setOriginId(destinationId);
    setDestinationId(originId);
  }, [originId, destinationId]);

  const handleRouteError = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const origin = PRESET_PLACES.find((p) => p.id === originId) ?? null;
  const destination = PRESET_PLACES.find((p) => p.id === destinationId) ?? null;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={HYEHWA_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
        preferCanvas
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LightMarkers />
        <CctvMarkers
          selectedIndex={selected?.index ?? null}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
        />
        <PoliceMarkers />
        <RouteLayer origin={origin} destination={destination} onError={handleRouteError} />
      </MapContainer>

      <SearchBar
        places={PRESET_PLACES}
        originId={originId}
        destinationId={destinationId}
        onOriginChange={setOriginId}
        onDestinationChange={setDestinationId}
        onSwap={handleSwap}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <BottomSheet open={selected !== null} onClose={handleDeselect}>
        {selected && <CctvDetail feature={selected.feature} />}
      </BottomSheet>
    </div>
  );
}
