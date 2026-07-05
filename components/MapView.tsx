"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { CctvFeature } from "@/lib/cctv";
import { useCctvFeatures } from "@/lib/cctv";
import { lightsNearRoute } from "@/lib/coverage";
import { useLightFeatures } from "@/lib/light";
import { usePoliceFeatures } from "@/lib/police";
import { PRESET_PLACES } from "@/lib/presets";
import { useRoutes, type RouteKey, type RoutePoint } from "@/lib/useRoutes";
import BottomSheet from "./BottomSheet";
import CctvDetail from "./CctvDetail";
import CctvMarkers from "./CctvMarkers";
import Disclaimer from "./Disclaimer";
import EmergencyButton from "./EmergencyButton";
import LightMarkers from "./LightMarkers";
import LoadingIndicator from "./LoadingIndicator";
import MapCenterTracker from "./MapCenterTracker";
import Onboarding from "./Onboarding";
import PoliceMarkers from "./PoliceMarkers";
import RouteLayer from "./RouteLayer";
import RouteLightGlow from "./RouteLightGlow";
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

// CARTO Dark Matter 타일 위에 남색 톤을 추가로 입힐지 토글. true/false 비교 후 톤이 과하면 false 유지.
const TILE_TINT_ENABLED = false;

export default function MapView() {
  const [selected, setSelected] = useState<{ index: number; feature: CctvFeature } | null>(
    null
  );
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [adhocOrigin, setAdhocOrigin] = useState<RoutePoint | null>(null);
  const [adhocDestination, setAdhocDestination] = useState<RoutePoint | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<"compare" | "selected">("compare");
  const [selectedRouteKey, setSelectedRouteKey] = useState<RouteKey | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: HYEHWA_CENTER[0],
    lng: HYEHWA_CENTER[1],
  });

  const cctvFeatures = useCctvFeatures();
  const policeFeatures = usePoliceFeatures();
  const lightFeatures = useLightFeatures();

  const handleSelect = useCallback((index: number, feature: CctvFeature) => {
    setSelected({ index, feature });
  }, []);

  const handleDeselect = useCallback(() => {
    setSelected(null);
  }, []);

  const handleRouteError = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  // 프리셋 드롭다운으로 새 출발/도착을 고르면 그때마다 비교(A) 상태로 되돌리고,
  // 응급 기능 등에서 쓰던 ad-hoc 좌표(GPS 등)는 무효화한다.
  const handleOriginChange = useCallback((id: string) => {
    setOriginId(id);
    setAdhocOrigin(null);
    setRouteMode("compare");
    setSelectedRouteKey(null);
  }, []);

  const handleDestinationChange = useCallback((id: string) => {
    setDestinationId(id);
    setAdhocDestination(null);
    setRouteMode("compare");
    setSelectedRouteKey(null);
  }, []);

  const handleSwap = useCallback(() => {
    setOriginId(destinationId);
    setDestinationId(originId);
    setAdhocOrigin(null);
    setAdhocDestination(null);
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

  // 긴급 "가까운 지구대로 안내": 출발=현재 위치(또는 지도 중심 폴백), 도착=최근접 지구대로
  // 즉시 세팅하고 비교 단계 없이 바로 상태 B(안심 경로 선택됨)로 진입한다.
  const handleRouteToPolice = useCallback((origin: RoutePoint, destination: RoutePoint) => {
    setOriginId("");
    setDestinationId("");
    setAdhocOrigin(origin);
    setAdhocDestination(destination);
    setSelectedRouteKey("safe");
    setRouteMode("selected");
    setSelected(null);
  }, []);

  const presetOrigin = PRESET_PLACES.find((p) => p.id === originId) ?? null;
  const presetDestination = PRESET_PLACES.find((p) => p.id === destinationId) ?? null;
  const origin = adhocOrigin ?? presetOrigin;
  const destination = adhocDestination ?? presetDestination;

  const { routes, graphLoading } = useRoutes(origin, destination, handleRouteError);

  const selectedRoute = routes?.find((r) => r.key === selectedRouteKey) ?? null;
  const routeFilterEdges =
    routeMode === "selected" && selectedRoute ? selectedRoute.result.edges : null;

  // 상태 B(경로 선택됨)에서만 경로 인근 조명을 필터링해 글로우 레이어에 넘긴다.
  const routeLights = useMemo(() => {
    if (routeMode !== "selected" || !selectedRoute) return [];
    return lightsNearRoute(selectedRoute.result.edges, lightFeatures);
  }, [routeMode, selectedRoute, lightFeatures]);

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          className={TILE_TINT_ENABLED ? "map-tile-tint" : undefined}
        />
        <MapCenterTracker onChange={setMapCenter} />
        {routeMode === "selected" && selectedRoute ? (
          <RouteLightGlow lights={routeLights} />
        ) : (
          <LightMarkers features={lightFeatures} />
        )}
        <CctvMarkers
          features={cctvFeatures}
          selectedIndex={selected?.index ?? null}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          routeFilterEdges={routeFilterEdges}
        />
        <PoliceMarkers features={policeFeatures} />
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
        onOriginChange={handleOriginChange}
        onDestinationChange={handleDestinationChange}
        onSwap={handleSwap}
      />

      {routeMode === "selected" && selectedRoute && (
        <button
          type="button"
          onClick={handleBackToCompare}
          className="fixed inset-x-0 z-[1500] mx-auto w-fit rounded-full border border-white/15 bg-neutral-900/85 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl active:scale-95"
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

      <EmergencyButton
        policeFeatures={policeFeatures}
        mapCenter={mapCenter}
        onRouteToPolice={handleRouteToPolice}
        onBeforeOpen={handleDeselect}
        onToast={setToastMessage}
      />

      <BottomSheet open={selected !== null} onClose={handleDeselect}>
        {selected && <CctvDetail feature={selected.feature} />}
      </BottomSheet>

      <Disclaimer />
      {graphLoading && <LoadingIndicator />}
      {!graphLoading && <Onboarding />}
    </div>
  );
}
