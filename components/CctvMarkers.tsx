"use client";

import { memo, useEffect } from "react";
import L from "leaflet";
import { Circle, LayerGroup, Marker, useMapEvents } from "react-leaflet";
import type { CctvFeature } from "@/lib/cctv";
import { cctvNearRoute } from "@/lib/coverage";
import type { GraphEdge } from "@/lib/graph";
import { useZoomVisible } from "./useZoomVisible";

const MIN_ZOOM = 17;
const BRAND_BLUE = "#0083FF";
const ROUTE_FILTER_BUFFER_M = 50;

const cctvIcon = L.divIcon({
  className: "cctv-div-icon",
  html: '<div class="cctv-marker">📹</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const cctvIconSelected = L.divIcon({
  className: "cctv-div-icon",
  html: '<div class="cctv-marker cctv-marker-selected">📹</div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

interface CctvMarkersProps {
  features: CctvFeature[];
  selectedIndex: number | null;
  onSelect: (index: number, feature: CctvFeature) => void;
  onDeselect: () => void;
  /** 지정하면 이 경로에서 50m 이내인 CCTV만 표시한다 (경로 선택 상태에서 사용). */
  routeFilterEdges?: GraphEdge[] | null;
}

const CctvMarkerItem = memo(function CctvMarkerItem({
  feature,
  isSelected,
  onSelect,
}: {
  feature: CctvFeature;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [lng, lat] = feature.geometry.coordinates;

  return (
    <>
      <Marker
        position={[lat, lng]}
        icon={isSelected ? cctvIconSelected : cctvIcon}
        eventHandlers={{ click: onSelect }}
      />
      {isSelected && (
        <Circle
          center={[lat, lng]}
          radius={feature.properties.coverageRadius}
          pathOptions={{ color: BRAND_BLUE, weight: 2, fillColor: BRAND_BLUE, fillOpacity: 0.15 }}
        />
      )}
    </>
  );
});

function CctvMarkers({
  features,
  selectedIndex,
  onSelect,
  onDeselect,
  routeFilterEdges,
}: CctvMarkersProps) {
  const visible = useZoomVisible(MIN_ZOOM);

  // 마커는 bubblingMouseEvents 기본값이 false라 클릭이 지도까지 전파되지 않는다.
  // 즉 이 핸들러는 마커가 아닌 지도 빈 공간을 탭했을 때만 발생한다.
  useMapEvents({
    click: onDeselect,
  });

  useEffect(() => {
    if (!visible) onDeselect();
  }, [visible, onDeselect]);

  if (!visible) return null;

  const indexed = features.map((feature, i) => ({ feature, i }));

  let visibleIndexed = indexed;
  if (routeFilterEdges) {
    const mask = cctvNearRoute(
      routeFilterEdges,
      indexed.map(({ feature }) => feature.geometry.coordinates),
      ROUTE_FILTER_BUFFER_M
    );
    visibleIndexed = indexed.filter((_, idx) => mask[idx]);
  }

  return (
    <LayerGroup>
      {visibleIndexed.map(({ feature, i }) => (
        <CctvMarkerItem
          key={i}
          feature={feature}
          isSelected={selectedIndex === i}
          onSelect={() => onSelect(i, feature)}
        />
      ))}
    </LayerGroup>
  );
}

export default memo(CctvMarkers);
