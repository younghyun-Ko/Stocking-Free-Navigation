"use client";

import { memo } from "react";
import L from "leaflet";
import { LayerGroup, Marker, Popup } from "react-leaflet";
import type { PoliceFeature } from "@/lib/police";

const policeIcon = L.divIcon({
  className: "police-div-icon",
  html: '<div class="police-marker"><img src="/icons/police-emblem.svg" alt="" /></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

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

interface PoliceMarkersProps {
  features: PoliceFeature[];
}

function PoliceMarkers({ features }: PoliceMarkersProps) {
  return (
    <LayerGroup>
      {features.map((feature, i) => (
        <PoliceMarker key={i} feature={feature} />
      ))}
    </LayerGroup>
  );
}

export default memo(PoliceMarkers);
