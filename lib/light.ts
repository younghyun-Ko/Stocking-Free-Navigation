"use client";

import { useEffect, useState } from "react";

export interface LightProperties {
  type: "security" | "street";
  id: string;
}

export interface LightFeature {
  geometry: { coordinates: [number, number] };
  properties: LightProperties;
}

/** public/data/lights.geojson을 한 번만 fetch해서 재사용할 수 있게 해주는 훅. */
export function useLightFeatures(): LightFeature[] {
  const [features, setFeatures] = useState<LightFeature[]>([]);

  useEffect(() => {
    fetch("/data/lights.geojson")
      .then((res) => res.json())
      .then((data) => setFeatures(data.features));
  }, []);

  return features;
}
