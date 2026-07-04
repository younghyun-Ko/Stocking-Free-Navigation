import type { GraphEdge } from "./graph";

const WALK_SPEED_M_PER_MIN = 67;
const BLIND_SPOT_COVERAGE_THRESHOLD = 0.2;

export interface RouteCoverageResult {
  totalLength: number;
  avgCoverage: number;
  avgSafety: number;
  walkMinutes: number;
}

/** 경로 전체의 길이가중 평균 coverage/safety와 도보 소요 시간을 계산한다. */
export function routeCoverage(edges: GraphEdge[]): RouteCoverageResult {
  const totalLength = edges.reduce((sum, e) => sum + e.length, 0);

  if (totalLength === 0) {
    return { totalLength: 0, avgCoverage: 0, avgSafety: 0, walkMinutes: 0 };
  }

  const weightedCoverage = edges.reduce((sum, e) => sum + e.coverage * e.length, 0);
  const weightedSafety = edges.reduce((sum, e) => sum + e.safety * e.length, 0);

  return {
    totalLength,
    avgCoverage: weightedCoverage / totalLength,
    avgSafety: weightedSafety / totalLength,
    walkMinutes: totalLength / WALK_SPEED_M_PER_MIN,
  };
}

/**
 * coverage < 0.2인 연속 엣지 구간들의 좌표열을 반환한다.
 * safety가 아니라 coverage 기준: 보안등이 밝아도 CCTV 기록이 없으면 사각지대로 본다.
 */
export function findBlindSpots(edges: GraphEdge[]): [number, number][][] {
  const blindSpots: [number, number][][] = [];
  let current: [number, number][] = [];

  const flush = () => {
    if (current.length > 0) {
      blindSpots.push(current);
      current = [];
    }
  };

  for (const edge of edges) {
    if (edge.coverage < BLIND_SPOT_COVERAGE_THRESHOLD) {
      if (current.length === 0) {
        current.push(edge.coords[0]);
      }
      current.push(...edge.coords.slice(1));
    } else {
      flush();
    }
  }
  flush();

  return blindSpots;
}
