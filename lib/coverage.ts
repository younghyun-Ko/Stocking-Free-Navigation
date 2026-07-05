import { haversineDistance, type GraphEdge } from "./graph";
import type { LightFeature } from "./light";

const WALK_SPEED_M_PER_MIN = 67;
const BLIND_SPOT_COVERAGE_THRESHOLD = 0.2;
const STREET_LIGHT_BUFFER_M = 25;
const SECURITY_LIGHT_BUFFER_M = 12;
const LIGHT_BBOX_PAD_M = 30;
const LAT_DEG_TO_M = 110_574; // 위도 1도당 미터 근사

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

/** lng/lat를 refLat 기준 로컬 평면좌표(미터)로 근사 변환한다. 좁은 지역 규모라 이 근사로 충분하다. */
function toLocalMeters(lat: number, lng: number, refLat: number): [number, number] {
  const lngDegToM = 111_320 * Math.cos((refLat * Math.PI) / 180);
  return [lng * lngDegToM, lat * LAT_DEG_TO_M];
}

/** 점(lat,lng)에서 세그먼트(lat1,lng1)-(lat2,lng2)까지의 최단거리(m)를 로컬 평면 근사로 계산한다. */
function pointToSegmentDistanceM(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  refLat: number
): number {
  const [px, py] = toLocalMeters(lat, lng, refLat);
  const [x1, y1] = toLocalMeters(lat1, lng1, refLat);
  const [x2, y2] = toLocalMeters(lat2, lng2, refLat);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * 경로(edges) 인근의 조명만 반환한다: 가로등(street)은 25m, 보안등(security)은 12m 이내.
 * 경로 좌표를 세그먼트로 나눠 point-to-segment 거리로 정밀 판별하되, 보안등 1,806개 전수를
 * 정밀계산하면 느리므로 경로 bounding box + 30m 버퍼로 1차 필터링 후 후보만 정밀계산한다.
 */
export function lightsNearRoute<T extends LightFeature>(edges: GraphEdge[], lightFeatures: T[]): T[] {
  const routeCoords: [number, number][] = [];
  edges.forEach((edge) => routeCoords.push(...edge.coords));
  if (routeCoords.length === 0 || lightFeatures.length === 0) return [];

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lng, lat] of routeCoords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const refLat = (minLat + maxLat) / 2;
  const latPad = LIGHT_BBOX_PAD_M / LAT_DEG_TO_M;
  const lngPad = LIGHT_BBOX_PAD_M / (111_320 * Math.cos((refLat * Math.PI) / 180));
  minLat -= latPad;
  maxLat += latPad;
  minLng -= lngPad;
  maxLng += lngPad;

  const candidates = lightFeatures.filter((f) => {
    const [lng, lat] = f.geometry.coordinates;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
  if (candidates.length === 0) return [];

  const segments: [number, number, number, number][] = [];
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [lng1, lat1] = routeCoords[i];
    const [lng2, lat2] = routeCoords[i + 1];
    segments.push([lng1, lat1, lng2, lat2]);
  }

  return candidates.filter((f) => {
    const bufferM = f.properties.type === "street" ? STREET_LIGHT_BUFFER_M : SECURITY_LIGHT_BUFFER_M;
    const [lng, lat] = f.geometry.coordinates;
    return segments.some(([lng1, lat1, lng2, lat2]) =>
      pointToSegmentDistanceM(lat, lng, lat1, lng1, lat2, lng2, refLat) <= bufferM
    );
  });
}
