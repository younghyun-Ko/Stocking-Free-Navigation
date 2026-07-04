"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import BottomSheet from "./BottomSheet";
import CctvDetail from "./CctvDetail";
import CctvMarkers, { type CctvFeature } from "./CctvMarkers";
import LightMarkers from "./LightMarkers";
import PoliceMarkers from "./PoliceMarkers";

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

  const handleSelect = useCallback((index: number, feature: CctvFeature) => {
    setSelected({ index, feature });
  }, []);

  const handleDeselect = useCallback(() => {
    setSelected(null);
  }, []);

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
      </MapContainer>

      <BottomSheet open={selected !== null} onClose={handleDeselect}>
        {selected && <CctvDetail feature={selected.feature} />}
      </BottomSheet>
    </div>
  );
}
