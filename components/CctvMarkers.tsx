"use client";

import { memo, useEffect } from "react";
import L from "leaflet";
import { Circle, LayerGroup, Marker, useMapEvents } from "react-leaflet";
import type { CctvFeature } from "@/lib/cctv";
import { cctvNearRoute } from "@/lib/coverage";
import type { GraphEdge } from "@/lib/graph";
import { useZoomVisible } from "./useZoomVisible";

const MIN_ZOOM = 17;
const COVERAGE_ORANGE = "#FFB020";
const ROUTE_FILTER_BUFFER_M = 50;
const CCTV_ICON_URL = "/icons/cctv-sign.svg";
const ICON_W = 28;
const ICON_H = 26;
const ICON_W_SELECTED = Math.round(ICON_W * 1.3);
const ICON_H_SELECTED = Math.round(ICON_H * 1.3);

const cctvIcon = L.divIcon({
  className: "cctv-div-icon",
  html: `<img class="cctv-marker" src="${CCTV_ICON_URL}" width="${ICON_W}" height="${ICON_H}" alt="" />`,
  iconSize: [ICON_W, ICON_H],
  iconAnchor: [ICON_W / 2, ICON_H],
});

const cctvIconSelected = L.divIcon({
  className: "cctv-div-icon",
  html: `<img class="cctv-marker cctv-marker-selected" src="${CCTV_ICON_URL}" width="${ICON_W_SELECTED}" height="${ICON_H_SELECTED}" alt="" />`,
  iconSize: [ICON_W_SELECTED, ICON_H_SELECTED],
  iconAnchor: [ICON_W_SELECTED / 2, ICON_H_SELECTED],
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
          pathOptions={{
            color: COVERAGE_ORANGE,
            weight: 2,
            opacity: 0.4,
            fillColor: COVERAGE_ORANGE,
            fillOpacity: 0.12,
          }}
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
