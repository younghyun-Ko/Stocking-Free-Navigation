export interface GraphNode {
  id: number;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  u: number;
  v: number;
  length: number;
  safety: number;
  coverage: number;
  light: number;
  coords: [number, number][]; // [lng, lat], OSM u→v 순서 그대로
}

export interface Graph {
  nodes: Map<number, GraphNode>;
  edges: GraphEdge[];
}

interface RawGraphJson {
  nodes: Record<string, [number, number]>;
  edges: GraphEdge[];
}

export function parseGraph(raw: RawGraphJson): Graph {
  const nodes = new Map<number, GraphNode>();
  for (const [idStr, coords] of Object.entries(raw.nodes)) {
    const id = Number(idStr);
    nodes.set(id, { id, lng: coords[0], lat: coords[1] });
  }
  return { nodes, edges: raw.edges };
}

/** 브라우저 전용: public/data/graph.json을 fetch로 로드한다. */
export async function loadGraph(url = "/data/graph.json"): Promise<Graph> {
  const res = await fetch(url);
  const raw = (await res.json()) as RawGraphJson;
  return parseGraph(raw);
}

export interface AdjacencyEntry {
  neighborId: number;
  edge: GraphEdge;
}

export function buildAdjacencyList(graph: Graph): Map<number, AdjacencyEntry[]> {
  const adjacency = new Map<number, AdjacencyEntry[]>();

  const addEntry = (from: number, to: number, edge: GraphEdge) => {
    const entries = adjacency.get(from);
    if (entries) {
      entries.push({ neighborId: to, edge });
    } else {
      adjacency.set(from, [{ neighborId: to, edge }]);
    }
  };

  for (const edge of graph.edges) {
    addEntry(edge.u, edge.v, edge);
    addEntry(edge.v, edge.u, edge);
  }

  return adjacency;
}

const EARTH_RADIUS_M = 6371000;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** 전수 탐색으로 임의 좌표에서 가장 가까운 그래프 노드를 찾는다 (노드 수가 작아 충분히 빠름). */
export function findNearestNode(graph: Graph, lat: number, lng: number): GraphNode {
  let nearest: GraphNode | null = null;
  let minDist = Infinity;

  graph.nodes.forEach((node) => {
    const dist = haversineDistance(lat, lng, node.lat, node.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  });

  if (!nearest) {
    throw new Error("그래프에 노드가 없습니다.");
  }
  return nearest;
}
