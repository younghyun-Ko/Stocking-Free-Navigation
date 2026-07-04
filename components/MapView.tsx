"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { CctvFeature } from "@/lib/cctv";
import { useCctvFeatures } from "@/lib/cctv";
import { PRESET_PLACES } from "@/lib/presets";
import { useRoutes, type RouteKey } from "@/lib/useRoutes";
import BottomSheet from "./BottomSheet";
import CctvDetail from "./CctvDetail";
import CctvMarkers from "./CctvMarkers";
import LightMarkers from "./LightMarkers";
import PoliceMarkers from "./PoliceMarkers";
import RouteLayer from "./RouteLayer";
import RouteOptionCards from "./RouteOptionCards";
import RouteSummaryCard from "./RouteSummaryCard";
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
  const [routeMode, setRouteMode] = useState<"compare" | "selected">("compare");
  const [selectedRouteKey, setSelectedRouteKey] = useState<RouteKey | null>(null);

  const cctvFeatures = useCctvFeatures();

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

  const routes = useRoutes(origin, destination, handleRouteError);

  // 출발/도착이 바뀌면 상태 B에 머물러 있던 흔적 없이 항상 비교(A) 상태로 되돌린다.
  useEffect(() => {
    setRouteMode("compare");
    setSelectedRouteKey(null);
  }, [originId, destinationId]);

  const handleSelectRoute = useCallback((key: RouteKey) => {
    setSelectedRouteKey(key);
    setRouteMode("selected");
  }, []);

  const handleBackToCompare = useCallback(() => {
    setRouteMode("compare");
    setSelectedRouteKey(null);
    setSelected(null);
  }, []);

  const selectedRoute = routes?.find((r) => r.key === selectedRouteKey) ?? null;
  const routeFilterEdges =
    routeMode === "selected" && selectedRoute ? selectedRoute.result.edges : null;

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
          features={cctvFeatures}
          selectedIndex={selected?.index ?? null}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          routeFilterEdges={routeFilterEdges}
        />
        <PoliceMarkers />
        <RouteLayer
          routes={routes}
          mode={routeMode}
          selectedKey={selectedRouteKey}
          onSelectRoute={handleSelectRoute}
        />
      </MapContainer>

      <SearchBar
        places={PRESET_PLACES}
        originId={originId}
        destinationId={destinationId}
        onOriginChange={setOriginId}
        onDestinationChange={setDestinationId}
        onSwap={handleSwap}
      />

      {routeMode === "selected" && selectedRoute && (
        <button
          type="button"
          onClick={handleBackToCompare}
          className="fixed inset-x-0 z-[1500] mx-auto w-fit rounded-full bg-neutral-900/85 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur active:scale-95"
          style={{ top: "max(6.5rem, calc(env(safe-area-inset-top) + 5.5rem))" }}
        >
          ← 다른 경로 보기
        </button>
      )}

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {routeMode === "compare" && routes && routes.length > 0 && (
        <RouteOptionCards routes={routes} onSelect={handleSelectRoute} />
      )}

      {routeMode === "selected" && selectedRoute && !selected && (
        <RouteSummaryCard route={selectedRoute} cctvFeatures={cctvFeatures} />
      )}

      <BottomSheet open={selected !== null} onClose={handleDeselect}>
        {selected && <CctvDetail feature={selected.feature} />}
      </BottomSheet>
    </div>
  );
}
