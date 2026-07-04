"use client";

import { memo, useEffect, useState } from "react";
import L from "leaflet";
import { LayerGroup, Marker, Popup } from "react-leaflet";

const policeIcon = L.divIcon({
  className: "police-div-icon",
  html: '<div class="police-marker">🛡️</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

interface PoliceFeature {
  geometry: { coordinates: [number, number] };
  properties: { name: string; needsVerification?: boolean };
}

const PoliceMarker = memo(function PoliceMarker({ feature }: { feature: PoliceFeature }) {
  const [lng, lat] = feature.geometry.coordinates;
  const { name, needsVerification } = feature.properties;

  return (
    <Marker position={[lat, lng]} icon={policeIcon}>
      <Popup>
        <b>{name}</b>
        {needsVerification && (
          <>
            <br />
            <span style={{ color: "#E74C3C" }}>⚠️ 좌표 미검증 (자리표시자)</span>
          </>
        )}
      </Popup>
    </Marker>
  );
});

function PoliceMarkers() {
  // public/data/police.geojson은 실제 지구대·파출소 좌표를 아직 확인하지 못해
  // 대략적인 위치로 채운 자리표시자 데이터(needsVerification: true)를 사용한다.
  // 실좌표 확보 후 해당 파일만 교체하면 된다.
  const [features, setFeatures] = useState<PoliceFeature[]>([]);

  useEffect(() => {
    fetch("/data/police.geojson")
      .then((res) => res.json())
      .then((data) => setFeatures(data.features));
  }, []);

  return (
    <LayerGroup>
      {features.map((feature, i) => (
        <PoliceMarker key={i} feature={feature} />
      ))}
    </LayerGroup>
  );
}

export default memo(PoliceMarkers);
