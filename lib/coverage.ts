import { haversineDistance, type GraphEdge } from "./graph";

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

export interface BlindSpot {
  coords: [number, number][];
  lengthM: number;
}

/**
 * coverage < 0.2인 연속 엣지 구간들을 좌표열+길이로 반환한다.
 * safety가 아니라 coverage 기준: 보안등이 밝아도 CCTV 기록이 없으면 사각지대로 본다.
 */
export function findBlindSpots(edges: GraphEdge[]): BlindSpot[] {
  const blindSpots: BlindSpot[] = [];
  let currentCoords: [number, number][] = [];
  let currentLength = 0;

  const flush = () => {
    if (currentCoords.length > 0) {
      blindSpots.push({ coords: currentCoords, lengthM: currentLength });
      currentCoords = [];
      currentLength = 0;
    }
  };

  for (const edge of edges) {
    if (edge.coverage < BLIND_SPOT_COVERAGE_THRESHOLD) {
      if (currentCoords.length === 0) {
        currentCoords.push(edge.coords[0]);
      }
      currentCoords.push(...edge.coords.slice(1));
      currentLength += edge.length;
    } else {
      flush();
    }
  }
  flush();

  return blindSpots;
}

/**
 * 각 포인트([lng, lat])가 경로(edges)로부터 bufferM 이내인지 판별한다.
 * 좁은 지역 규모라 투영 없이 하버사인 근사로 충분하다.
 */
export function cctvNearRoute(
  edges: GraphEdge[],
  points: [number, number][],
  bufferM: number
): boolean[] {
  const routeCoords: [number, number][] = [];
  edges.forEach((edge) => routeCoords.push(...edge.coords));

  return points.map(([lng, lat]) => {
    for (const [routeLng, routeLat] of routeCoords) {
      if (haversineDistance(lat, lng, routeLat, routeLng) <= bufferM) {
        return true;
      }
    }
    return false;
  });
}
