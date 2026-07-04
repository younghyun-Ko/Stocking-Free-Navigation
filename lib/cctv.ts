"use client";

import { useEffect, useState } from "react";

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

/** public/data/cctv.geojson을 한 번만 fetch해서 재사용할 수 있게 해주는 훅. */
export function useCctvFeatures(): CctvFeature[] {
  const [features, setFeatures] = useState<CctvFeature[]>([]);

  useEffect(() => {
    fetch("/data/cctv.geojson")
      .then((res) => res.json())
      .then((data) => setFeatures(data.features));
  }, []);

  return features;
}
