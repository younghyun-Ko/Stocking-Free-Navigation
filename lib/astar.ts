import { buildAdjacencyList, haversineDistance, type Graph, type GraphEdge } from "./graph";

export type CostFn = (edge: GraphEdge) => number;

export interface RouteResult {
  path: number[];
  edges: GraphEdge[];
  totalLength: number;
}

export const costShortest: CostFn = (edge) => edge.length;
export const costBalanced: CostFn = (edge) => edge.length * (1.5 - edge.safety);
export const costSafe: CostFn = (edge) => edge.length * (2.5 - 2 * edge.safety);

// costBalanced/costSafe는 safety=1인 구간에 length*0.5까지 비용을 깎아준다(더 안전할수록
// 더 "싸게" 취급). 따라서 하버사인 직선거리를 그대로 휴리스틱으로 쓰면 admissible이
// 깨질 수 있어(직선거리가 실제 잔여 비용보다 커지는 경우가 생김), 세 비용함수 모두에서
// 성립하는 최소 배율(0.5)만큼 미리 낮춰서 사용한다.
const MIN_COST_FACTOR = 0.5;

interface HeapItem {
  id: number;
  priority: number;
}

class MinHeap {
  private items: HeapItem[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: HeapItem): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): HeapItem | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last !== undefined) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].priority <= this.items[index].priority) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    const n = this.items.length;
    for (;;) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < n && this.items[left].priority < this.items[smallest].priority) smallest = left;
      if (right < n && this.items[right].priority < this.items[smallest].priority) smallest = right;
      if (smallest === index) break;
      [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
      index = smallest;
    }
  }
}

export function aStar(
  graph: Graph,
  startId: number,
  endId: number,
  costFn: CostFn
): RouteResult | null {
  if (!graph.nodes.has(startId) || !graph.nodes.has(endId)) {
    throw new Error("start 또는 end 노드가 그래프에 없습니다.");
  }

  if (startId === endId) {
    return { path: [startId], edges: [], totalLength: 0 };
  }

  const adjacency = buildAdjacencyList(graph);
  const endNode = graph.nodes.get(endId)!;

  const heuristic = (nodeId: number): number => {
    const node = graph.nodes.get(nodeId);
    if (!node) return 0;
    return haversineDistance(node.lat, node.lng, endNode.lat, endNode.lng) * MIN_COST_FACTOR;
  };

  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, { prevId: number; edge: GraphEdge }>();
  const visited = new Set<number>();

  gScore.set(startId, 0);
  const open = new MinHeap();
  open.push({ id: startId, priority: heuristic(startId) });

  while (open.size > 0) {
    const current = open.pop()!;
    if (visited.has(current.id)) continue;
    if (current.id === endId) break;
    visited.add(current.id);

    const neighbors = adjacency.get(current.id) ?? [];
    for (const { neighborId, edge } of neighbors) {
      if (visited.has(neighborId)) continue;

      const tentativeG = (gScore.get(current.id) ?? Infinity) + costFn(edge);
      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        gScore.set(neighborId, tentativeG);
        cameFrom.set(neighborId, { prevId: current.id, edge });
        open.push({ id: neighborId, priority: tentativeG + heuristic(neighborId) });
      }
    }
  }

  if (!cameFrom.has(endId)) {
    return null;
  }

  const path: number[] = [endId];
  const edges: GraphEdge[] = [];
  let currentId = endId;

  while (currentId !== startId) {
    const entry = cameFrom.get(currentId);
    if (!entry) return null;

    // edge.coords의 저장 순서는 u→v/v→u가 뒤섞여 있다(osmnx 무방향 변환 과정에서
    // 원 방향이 엣지마다 다르게 유지됨 - u/v 라벨만으로는 신뢰할 수 없어 실측 거리로
    // 판별). 경로 진행 방향(prevId→currentId)의 시작점과 실제로 더 가까운 쪽이
    // coords[0]에 오도록 필요하면 뒤집어, 좌표열이 끊기지 않게 한다.
    const prevNode = graph.nodes.get(entry.prevId)!;
    const first = entry.edge.coords[0];
    const last = entry.edge.coords[entry.edge.coords.length - 1];
    const distFirstToPrev = haversineDistance(first[1], first[0], prevNode.lat, prevNode.lng);
    const distLastToPrev = haversineDistance(last[1], last[0], prevNode.lat, prevNode.lng);
    const orientedEdge: GraphEdge =
      distLastToPrev < distFirstToPrev
        ? { ...entry.edge, coords: [...entry.edge.coords].reverse() }
        : entry.edge;

    edges.push(orientedEdge);
    currentId = entry.prevId;
    path.push(currentId);
  }

  path.reverse();
  edges.reverse();

  const totalLength = edges.reduce((sum, e) => sum + e.length, 0);

  return { path, edges, totalLength };
}
