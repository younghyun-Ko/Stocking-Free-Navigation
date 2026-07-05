"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Marker, Polyline, Popup, useMap } from "react-leaflet";
import { findBlindSpots, routeCoverage, type BlindSpot } from "@/lib/coverage";
import { haversineDistance } from "@/lib/graph";
import type { RenderableRoute, RouteKey } from "@/lib/useRoutes";

interface RouteLayerProps {
  routes: RenderableRoute[] | null;
  mode: "compare" | "selected";
  selectedKey: RouteKey | null;
  onSelectRoute: (key: RouteKey) => void;
}

const GRAY = "#9CA3AF";
const BRAND_BLUE = "#0083FF";
const BLIND_SPOT_RED = "#E11D48";
const ARROW_INTERVAL_MIN = 60; // m
const FADE_MS = 300;

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** coords를 따라 누적거리 targetDistance(m) 지점의 좌표와 그 지점에서의 진행방향을 구한다. */
function pointAtDistance(
  coords: [number, number][],
  targetDistance: number
): { lat: number; lng: number; bearingDeg: number } | null {
  let accumulated = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    const segmentLength = haversineDistance(lat1, lng1, lat2, lng2);
    if (accumulated + segmentLength >= targetDistance) {
      const t = segmentLength === 0 ? 0 : (targetDistance - accumulated) / segmentLength;
      return {
        lat: lat1 + (lat2 - lat1) * t,
        lng: lng1 + (lng2 - lng1) * t,
        bearingDeg: bearingDeg(lat1, lng1, lat2, lng2),
      };
    }
    accumulated += segmentLength;
  }
  return null;
}

function totalDistance(coords: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    sum += haversineDistance(lat1, lng1, lat2, lng2);
  }
  return sum;
}

function labelIcon(text: string, variant: "safe" | "default"): L.DivIcon {
  return L.divIcon({
    className: "route-label-icon",
    html: `<div class="route-label ${variant === "safe" ? "route-label-safe" : "route-label-default"}">${text}</div>`,
  });
}

function arrowIcon(bearing: number): L.DivIcon {
  return L.divIcon({
    className: "route-arrow-icon",
    html: `<div class="route-arrow" style="transform: rotate(${bearing}deg)">▲</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function warningIcon(): L.DivIcon {
  return L.divIcon({
    className: "blindspot-icon",
    html: '<div class="blindspot-marker">⚠️</div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function boundsOf(coordsList: [number, number][][]): L.LatLngBounds | null {
  const all = coordsList.flat();
  if (all.length === 0) return null;
  return L.latLngBounds(all.map(([lng, lat]) => [lat, lng] as [number, number]));
}

export default function RouteLayer({ routes, mode, selectedKey, onSelectRoute }: RouteLayerProps) {
  const map = useMap();
  const svgRenderer = useMemo(() => L.svg(), []);

  const [displayRoutes, setDisplayRoutes] = useState<RenderableRoute[]>([]);
  const [fadingKeys, setFadingKeys] = useState<Set<RouteKey>>(new Set());
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 비교(A) <-> 선택(B) 전환 시 사라지는 경로를 300ms 페이드 아웃 후 언마운트한다.
  useEffect(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    if (!routes || routes.length === 0) {
      setDisplayRoutes([]);
      setFadingKeys(new Set());
      return;
    }

    if (mode === "compare") {
      setDisplayRoutes(routes);
      setFadingKeys(new Set());
      return;
    }

    // mode === "selected": 일단 전부 그려둔 채 선택되지 않은 것만 fade-out 표시
    setDisplayRoutes(routes);
    const others = routes.filter((r) => r.key !== selectedKey).map((r) => r.key);
    setFadingKeys(new Set(others));

    fadeTimerRef.current = setTimeout(() => {
      setDisplayRoutes(routes.filter((r) => r.key === selectedKey));
      setFadingKeys(new Set());
    }, FADE_MS);

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [routes, mode, selectedKey]);

  // 지도 시야: 비교 모드면 전체 경로가 보이게, 선택 모드면 선택 경로로 flyToBounds.
  useEffect(() => {
    if (!routes || routes.length === 0) return;

    if (mode === "compare") {
      const bounds = boundsOf(routes.map((r) => r.coords));
      if (bounds) map.fitBounds(bounds, { padding: [60, 60] });
    } else {
      const selected = routes.find((r) => r.key === selectedKey);
      if (selected) {
        const bounds = boundsOf([selected.coords]);
        if (bounds) map.flyToBounds(bounds, { padding: [80, 80], duration: 0.6 });
      }
    }
  }, [mode, selectedKey, routes, map]);

  const blindSpots: BlindSpot[] = useMemo(() => {
    if (mode !== "selected" || !selectedKey || !routes) return [];
    const selected = routes.find((r) => r.key === selectedKey);
    return selected ? findBlindSpots(selected.result.edges) : [];
  }, [mode, selectedKey, routes]);

  if (displayRoutes.length === 0) return null;

  return (
    <>
      {displayRoutes.map((route) => {
        const isSelectedRoute = mode === "selected" && route.key === selectedKey;
        const emphasize = mode === "compare" ? route.key === "safe" : isSelectedRoute;
        const fading = fadingKeys.has(route.key);
        const dist = totalDistance(route.coords);
        const mid = pointAtDistance(route.coords, dist / 2);
        const coverage = routeCoverage(route.result.edges);
        const arrows =
          emphasize && !fading
            ? (() => {
                const interval = Math.max(ARROW_INTERVAL_MIN, dist / 6);
                const points: { lat: number; lng: number; bearingDeg: number }[] = [];
                for (let d = interval; d < dist; d += interval) {
                  const p = pointAtDistance(route.coords, d);
                  if (p) points.push(p);
                }
                return points;
              })()
            : [];

        return (
          <Fragment key={route.key}>
            <Polyline
              renderer={svgRenderer}
              positions={route.coords.map(([lng, lat]) => [lat, lng])}
              pathOptions={{
                className: "route-path-svg",
                color: emphasize ? BRAND_BLUE : GRAY,
                weight: emphasize ? 7 : 5,
                opacity: fading ? 0 : emphasize ? 0.95 : 0.85,
              }}
              eventHandlers={
                mode === "compare" ? { click: () => onSelectRoute(route.key) } : undefined
              }
            />

            {arrows.map((arrow, i) => (
              <Marker
                key={`arrow-${i}`}
                position={[arrow.lat, arrow.lng]}
                icon={arrowIcon(arrow.bearingDeg)}
                interactive={false}
              />
            ))}

            {mid && !fading && (
              <Marker
                position={[mid.lat, mid.lng]}
                icon={labelIcon(
                  `${route.label} ${Math.round(coverage.walkMinutes)}분 · ${
                    route.key === "safe" ? "CCTV " : ""
                  }${Math.round(coverage.avgCoverage * 100)}%`,
                  route.key === "safe" ? "safe" : "default"
                )}
                eventHandlers={
                  mode === "compare" ? { click: () => onSelectRoute(route.key) } : undefined
                }
              />
            )}
          </Fragment>
        );
      })}

      {mode === "selected" &&
        blindSpots.map((spot, i) => {
          const mid = pointAtDistance(spot.coords, spot.lengthM / 2);
          return (
            <Fragment key={`blindspot-${i}`}>
              <Polyline
                renderer={svgRenderer}
                positions={spot.coords.map(([lng, lat]) => [lat, lng])}
                pathOptions={{
                  className: "route-path-svg",
                  color: BLIND_SPOT_RED,
                  weight: 5,
                  dashArray: "8 8",
                  opacity: 0.95,
                }}
              />
              {mid && (
                <Marker position={[mid.lat, mid.lng]} icon={warningIcon()}>
                  <Popup>
                    이 구간(약 {Math.round(spot.lengthM)}m)은 CCTV 기록이 남지 않습니다.
                  </Popup>
                </Marker>
              )}
            </Fragment>
          );
        })}
    </>
  );
}
