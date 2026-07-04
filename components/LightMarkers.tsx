"use client";

import { memo, useEffect, useState } from "react";
import { CircleMarker, LayerGroup } from "react-leaflet";
import { useZoomVisible } from "./useZoomVisible";

const MIN_ZOOM = 18;
const LIGHT_COLOR = "#FFD400";

interface LightFeature {
  geometry: { coordinates: [number, number] };
  properties: { type: "security" | "street"; id: string };
}

function LightMarkers() {
  const [features, setFeatures] = useState<LightFeature[]>([]);
  const visible = useZoomVisible(MIN_ZOOM);

  useEffect(() => {
    fetch("/data/lights.geojson")
      .then((res) => res.json())
      .then((data) => setFeatures(data.features));
  }, []);

  if (!visible) return null;

  // 보안등/가로등 1,806개+ 모두 CircleMarker + Canvas 렌더러(MapView의 preferCanvas)로 그려
  // DOM 마커(divIcon) 대비 줌·드래그 성능을 유지한다.
  return (
    <LayerGroup>
      {features.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        return (
          <CircleMarker
            key={`${feature.properties.type}-${feature.properties.id}`}
            center={[lat, lng]}
            radius={2}
            pathOptions={{
              color: LIGHT_COLOR,
              fillColor: LIGHT_COLOR,
              fillOpacity: 0.9,
              weight: 0,
            }}
          />
        );
      })}
    </LayerGroup>
  );
}

export default memo(LightMarkers);
