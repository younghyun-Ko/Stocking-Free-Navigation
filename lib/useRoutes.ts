"use client";

import { useEffect, useState } from "react";
import { aStar, costBalanced, costSafe, costShortest, type RouteResult } from "./astar";
import { findNearestNode, loadGraph, type Graph } from "./graph";

export type RouteKey = "shortest" | "balanced" | "safe";

/** 경로 계산의 출발/도착 입력. 프리셋 장소뿐 아니라 GPS 좌표 등 임의 지점도 구조적으로 호환된다. */
export interface RoutePoint {
  id: string;
  lat: number;
  lng: number;
}

export interface RenderableRoute {
  key: RouteKey;
  label: string;
  result: RouteResult;
  coords: [number, number][];
}

export function edgesToCoords(edges: RouteResult["edges"]): [number, number][] {
  const coords: [number, number][] = [];
  edges.forEach((edge, i) => {
    coords.push(...(i === 0 ? edge.coords : edge.coords.slice(1)));
  });
  return coords;
}

/** graph.json을 로드하고 origin/destination이 바뀔 때마다 비용함수 3종으로 A*를 실행한다. */
export function useRoutes(
  origin: RoutePoint | null,
  destination: RoutePoint | null,
  onError: (message: string) => void
): RenderableRoute[] | null {
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

    setRoutes([
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
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, origin, destination]);

  return routes;
}
