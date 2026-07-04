import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import { aStar, costBalanced, costSafe, costShortest, type CostFn } from "../lib/astar";
import { findBlindSpots, routeCoverage } from "../lib/coverage";
import { findNearestNode, parseGraph } from "../lib/graph";

const GRAPH_PATH = path.resolve(__dirname, "../public/data/graph.json");

const START = { lat: 37.5823, lng: 127.0019, label: "혜화역 2번출구" };
const END = { lat: 37.588, lng: 126.9937, label: "성균관대 정문" };

interface RouteRow {
  name: string;
  distance: number;
  minutes: number;
  coveragePct: number;
  blindSpots: number;
}

function printTable(header: string[], rows: string[][]): void {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const printRow = (cells: string[]) =>
    console.log(cells.map((c, i) => c.padEnd(widths[i])).join(" | "));

  printRow(header);
  console.log(widths.map((w) => "-".repeat(w)).join("-|-"));
  rows.forEach(printRow);
}

function main(): void {
  const raw = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf-8"));
  const graph = parseGraph(raw);
  console.log(`그래프 로드: 노드 ${graph.nodes.size} / 엣지 ${graph.edges.length}\n`);

  const startNode = findNearestNode(graph, START.lat, START.lng);
  const endNode = findNearestNode(graph, END.lat, END.lng);

  console.log(
    `${START.label} → 가장 가까운 노드 ${startNode.id} (${startNode.lat.toFixed(5)}, ${startNode.lng.toFixed(5)})`
  );
  console.log(
    `${END.label} → 가장 가까운 노드 ${endNode.id} (${endNode.lat.toFixed(5)}, ${endNode.lng.toFixed(5)})\n`
  );

  const presets: { name: string; costFn: CostFn }[] = [
    { name: "최단", costFn: costShortest },
    { name: "균형", costFn: costBalanced },
    { name: "안심", costFn: costSafe },
  ];

  const rows: RouteRow[] = presets.map(({ name, costFn }) => {
    const result = aStar(graph, startNode.id, endNode.id, costFn);
    if (!result) {
      throw new Error(`${name} 경로를 찾을 수 없습니다.`);
    }

    const coverage = routeCoverage(result.edges);
    const blindSpots = findBlindSpots(result.edges);

    return {
      name,
      distance: coverage.totalLength,
      minutes: coverage.walkMinutes,
      coveragePct: coverage.avgCoverage * 100,
      blindSpots: blindSpots.length,
    };
  });

  const header = ["비용함수", "거리(m)", "시간(분)", "커버리지(%)", "사각구간수"];
  const tableRows = rows.map((r) => [
    r.name,
    r.distance.toFixed(1),
    r.minutes.toFixed(1),
    r.coveragePct.toFixed(1),
    String(r.blindSpots),
  ]);

  printTable(header, tableRows);

  const shortest = rows.find((r) => r.name === "최단")!;
  const safe = rows.find((r) => r.name === "안심")!;

  assert.ok(
    safe.coveragePct >= shortest.coveragePct,
    `안심 경로 커버리지(${safe.coveragePct.toFixed(1)}%)가 최단 경로(${shortest.coveragePct.toFixed(1)}%)보다 낮습니다.`
  );

  console.log("\n✅ 안심 경로 커버리지 >= 최단 경로 커버리지 검증 통과");
}

main();
