"use client";

import { useEffect, useState } from "react";
import { haversineDistance } from "./graph";
import type { RoutePoint } from "./useRoutes";

export interface PoliceFeature {
  geometry: { coordinates: [number, number] };
  properties: { name: string; needsVerification?: boolean };
}

/**
 * public/data/police.geojson을 한 번만 fetch해서 재사용할 수 있게 해주는 훅.
 * 이 파일의 좌표는 실측 전 자리표시자(needsVerification: true)이므로,
 * "가까운 지구대로 안내" 결과도 실좌표 확보 전까지는 근사치다.
 */
export function usePoliceFeatures(): PoliceFeature[] {
  const [features, setFeatures] = useState<PoliceFeature[]>([]);

  useEffect(() => {
    fetch("/data/police.geojson")
      .then((res) => res.json())
      .then((data) => setFeatures(data.features));
  }, []);

  return features;
}

export function findNearestPolice(
  features: PoliceFeature[],
  lat: number,
  lng: number
): RoutePoint | null {
  let nearest: PoliceFeature | null = null;
  let minDist = Infinity;

  for (const feature of features) {
    const [flng, flat] = feature.geometry.coordinates;
    const dist = haversineDistance(lat, lng, flat, flng);
    if (dist < minDist) {
      minDist = dist;
      nearest = feature;
    }
  }

  if (!nearest) return null;
  const [lng2, lat2] = nearest.geometry.coordinates;
  return { id: `police-${nearest.properties.name}`, lat: lat2, lng: lng2 };
}
