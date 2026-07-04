"use client";

import { useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";

export function useZoomVisible(minZoom: number): boolean {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
  });

  return zoom >= minZoom;
}
