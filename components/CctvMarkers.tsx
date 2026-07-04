"use client";

import { memo, useEffect, useState } from "react";
import L from "leaflet";
import { LayerGroup, Marker, Popup } from "react-leaflet";
import { useZoomVisible } from "./useZoomVisible";

const MIN_ZOOM = 17;

const cctvIcon = L.divIcon({
  className: "cctv-div-icon",
  html: '<div class="cctv-marker">📹</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

interface CctvProperties {
  purpose: string;
  cameraCount: number;
  resolution: number;
  direction: string;
  coverageRadius: number;
  roadAddress: string;
}

interface CctvFeature {
  geometry: { coordinates: [number, number] };
  properties: CctvProperties;
}

const CctvMarker = memo(function CctvMarker({ feature }: { feature: CctvFeature }) {
  const [lng, lat] = feature.geometry.coordinates;
  const { purpose, cameraCount, resolution, direction, coverageRadius, roadAddress } =
    feature.properties;

  return (
    <Marker position={[lat, lng]} icon={cctvIcon}>
      <Popup>
        <b>{purpose}</b>
        <br />
        카메라 {cameraCount}대 / {resolution}만화소
        <br />
        방면: {direction}
        <br />
        커버리지 반경: {coverageRadius}m
        <br />
        {roadAddress}
      </Popup>
    </Marker>
  );
});

function CctvMarkers() {
  const [features, setFeatures] = useState<CctvFeature[]>([]);
  const visible = useZoomVisible(MIN_ZOOM);

  useEffect(() => {
    fetch("/data/cctv.geojson")
      .then((res) => res.json())
      .then((data) => setFeatures(data.features));
  }, []);

  if (!visible) return null;

  return (
    <LayerGroup>
      {features.map((feature, i) => (
        <CctvMarker key={i} feature={feature} />
      ))}
    </LayerGroup>
  );
}

export default memo(CctvMarkers);
