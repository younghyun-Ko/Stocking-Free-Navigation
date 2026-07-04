"use client";

import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

interface MapCenterTrackerProps {
  onChange: (center: { lat: number; lng: number }) => void;
}

/** 위치 권한이 없을 때 "현재 위치" 폴백으로 쓸 수 있게 지도 중심 좌표를 계속 보고한다. */
export default function MapCenterTracker({ onChange }: MapCenterTrackerProps) {
  const map = useMap();

  useEffect(() => {
    const center = map.getCenter();
    onChange({ lat: center.lat, lng: center.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onChange({ lat: center.lat, lng: center.lng });
    },
  });

  return null;
}
