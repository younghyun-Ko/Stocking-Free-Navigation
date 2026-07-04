"use client";

import { memo, useEffect, useState } from "react";
import L from "leaflet";
import { Circle, LayerGroup, Marker, useMapEvents } from "react-leaflet";
import { useZoomVisible } from "./useZoomVisible";

const MIN_ZOOM = 17;
const BRAND_BLUE = "#0083FF";

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

export interface CctvProperties {
  purpose: string;
  cameraCount: number;
  resolution: number;
  direction: string;
  retentionDays: number | null;
  roadAddress: string;
  lotAddress: string;
  agency: string;
  agencyPhone: string;
  coverageRadius: number;
}

export interface CctvFeature {
  geometry: { coordinates: [number, number] };
  properties: CctvProperties;
}

interface CctvMarkersProps {
  selectedIndex: number | null;
  onSelect: (index: number, feature: CctvFeature) => void;
  onDeselect: () => void;
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

function CctvMarkers({ selectedIndex, onSelect, onDeselect }: CctvMarkersProps) {
  const [features, setFeatures] = useState<CctvFeature[]>([]);
  const visible = useZoomVisible(MIN_ZOOM);

  useEffect(() => {
    fetch("/data/cctv.geojson")
      .then((res) => res.json())
      .then((data) => setFeatures(data.features));
  }, []);

  // 마커는 bubblingMouseEvents 기본값이 false라 클릭이 지도까지 전파되지 않는다.
  // 즉 이 핸들러는 마커가 아닌 지도 빈 공간을 탭했을 때만 발생한다.
  useMapEvents({
    click: onDeselect,
  });

  useEffect(() => {
    if (!visible) onDeselect();
  }, [visible, onDeselect]);

  if (!visible) return null;

  return (
    <LayerGroup>
      {features.map((feature, i) => (
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
