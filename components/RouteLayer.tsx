"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Marker, Polyline, useMap } from "react-leaflet";
import { aStar, costBalanced, costSafe, costShortest } from "@/lib/astar";
import { routeCoverage } from "@/lib/coverage";
import { findNearestNode, haversineDistance, loadGraph, type Graph } from "@/lib/graph";
import type { PresetPlace } from "@/lib/presets";
import type { RouteResult } from "@/lib/astar";

interface RouteLayerProps {
  origin: PresetPlace | null;
  destination: PresetPlace | null;
  onError: (message: string) => void;
}

interface RenderableRoute {
  key: "shortest" | "balanced" | "safe";
  label: string;
  result: RouteResult;
  coords: [number, number][]; // [lng, lat]
}

const GRAY = "#9CA3AF";
const BRAND_BLUE = "#0083FF";
const ARROW_INTERVAL_MIN = 60; // m

function edgesToCoords(edges: RouteResult["edges"]): [number, number][] {
  const coords: [number, number][] = [];
  edges.forEach((edge, i) => {
    coords.push(...(i === 0 ? edge.coords : edge.coords.slice(1)));
  });
  return coords;
}

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

export default function RouteLayer({ origin, destination, onError }: RouteLayerProps) {
  const map = useMap();
  const [graph, setGraph] = useState<Graph | null>(null);
  const [routes, setRoutes] = useState<RenderableRoute[] | null>(null);

  useEffect(() => {
    loadGraph().then(setGraph);
  }, []);

  useEffect(() => {
    if (!graph || !origin || !destination) {
      setRoutes(null);
      return;
    }

    if (origin.id === destination.id) {
      onError("출발지와 도착지가 같습니다.");
      setRoutes(null);
      return;
    }

    const startNode = findNearestNode(graph, origin.lat, origin.lng);
    const endNode = findNearestNode(graph, destination.lat, destination.lng);

    const shortest = aStar(graph, startNode.id, endNode.id, costShortest);
    const balanced = aStar(graph, startNode.id, endNode.id, costBalanced);
    const safe = aStar(graph, startNode.id, endNode.id, costSafe);

    if (!shortest || !balanced || !safe) {
      onError("경로를 찾을 수 없습니다.");
      setRoutes(null);
      return;
    }

    const showBalanced = balanced.path.join(",") !== safe.path.join(",");

    const next: RenderableRoute[] = [
      { key: "shortest", label: "최단", result: shortest, coords: edgesToCoords(shortest.edges) },
      ...(showBalanced
        ? [
            {
              key: "balanced" as const,
              label: "균형",
              result: balanced,
              coords: edgesToCoords(balanced.edges),
            },
          ]
        : []),
      { key: "safe", label: "추천", result: safe, coords: edgesToCoords(safe.edges) },
    ];

    setRoutes(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, origin, destination]);

  useEffect(() => {
    if (!routes || routes.length === 0) return;
    const allCoords = routes.flatMap((r) => r.coords);
    if (allCoords.length === 0) return;
    const bounds = L.latLngBounds(allCoords.map(([lng, lat]) => [lat, lng] as [number, number]));
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [routes, map]);

  const decorated = useMemo(() => {
    if (!routes) return [];
    return routes.map((route) => {
      const coverage = routeCoverage(route.result.edges);
      const dist = totalDistance(route.coords);
      const mid = pointAtDistance(route.coords, dist / 2);
      const arrows =
        route.key === "safe"
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

      return {
        ...route,
        coverage,
        midpoint: mid,
        arrows,
      };
    });
  }, [routes]);

  if (decorated.length === 0) return null;

  return (
    <>
      {decorated
        .filter((r) => r.key !== "safe")
        .map((route) => (
          <Polyline
            key={route.key}
            positions={route.coords.map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color: GRAY, weight: 5, opacity: 0.85 }}
          />
        ))}

      {decorated
        .filter((r) => r.key === "safe")
        .map((route) => (
          <Polyline
            key={route.key}
            positions={route.coords.map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color: BRAND_BLUE, weight: 7, opacity: 0.95 }}
          />
        ))}

      {decorated.flatMap((route) =>
        route.arrows.map((arrow, i) => (
          <Marker
            key={`${route.key}-arrow-${i}`}
            position={[arrow.lat, arrow.lng]}
            icon={arrowIcon(arrow.bearingDeg)}
            interactive={false}
          />
        ))
      )}

      {decorated.map(
        (route) =>
          route.midpoint && (
            <Marker
              key={`${route.key}-label`}
              position={[route.midpoint.lat, route.midpoint.lng]}
              icon={labelIcon(
                `${route.label} ${Math.round(route.coverage.walkMinutes)}분 · ${
                  route.key === "safe" ? "CCTV " : ""
                }${Math.round(route.coverage.avgCoverage * 100)}%`,
                route.key === "safe" ? "safe" : "default"
              )}
              interactive={false}
            />
          )
      )}
    </>
  );
}
