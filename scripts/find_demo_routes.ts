import fs from "node:fs";
import path from "node:path";

import { aStar, costSafe, costShortest } from "../lib/astar";
import { findBlindSpots, routeCoverage } from "../lib/coverage";
import { findNearestNode, parseGraph } from "../lib/graph";
import { PRESET_PLACES, type PresetPlace } from "../lib/presets";

const GRAPH_PATH = path.resolve(__dirname, "../public/data/graph.json");

const MIN_COVERAGE_IMPROVEMENT_PP = 15; // percentage points
const MAX_TIME_INCREASE_MIN = 3;
const TOP_N = 5;

interface ComboResult {
  origin: PresetPlace;
  destination: PresetPlace;
  shortestMinutes: number;
  shortestCoveragePct: number;
  shortestBlindSpots: number;
  safeMinutes: number;
  safeCoveragePct: number;
  safeBlindSpots: number;
  coverageImprovementPp: number;
  timeIncreaseMin: number;
  blindSpotReduction: number;
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

  // 프리셋별 가장 가까운 노드는 조합마다 반복 계산할 필요 없이 한 번만 구해 재사용한다.
  const nearestNodeId = new Map<string, number>();
  for (const place of PRESET_PLACES) {
    nearestNodeId.set(place.id, findNearestNode(graph, place.lat, place.lng).id);
  }

  const results: ComboResult[] = [];
  let skippedSamePlace = 0;
  let skippedNoRoute = 0;

  for (const origin of PRESET_PLACES) {
    for (const destination of PRESET_PLACES) {
      if (origin.id === destination.id) {
        skippedSamePlace++;
        continue;
      }

      const startId = nearestNodeId.get(origin.id)!;
      const endId = nearestNodeId.get(destination.id)!;

      const shortest = aStar(graph, startId, endId, costShortest);
      const safe = aStar(graph, startId, endId, costSafe);

      if (!shortest || !safe) {
        skippedNoRoute++;
        continue;
      }

      const shortestCoverage = routeCoverage(shortest.edges);
      const safeCoverage = routeCoverage(safe.edges);
      const shortestBlindSpots = findBlindSpots(shortest.edges).length;
      const safeBlindSpots = findBlindSpots(safe.edges).length;

      const shortestCoveragePct = shortestCoverage.avgCoverage * 100;
      const safeCoveragePct = safeCoverage.avgCoverage * 100;

      results.push({
        origin,
        destination,
        shortestMinutes: shortestCoverage.walkMinutes,
        shortestCoveragePct,
        shortestBlindSpots,
        safeMinutes: safeCoverage.walkMinutes,
        safeCoveragePct,
        safeBlindSpots,
        coverageImprovementPp: safeCoveragePct - shortestCoveragePct,
        timeIncreaseMin: safeCoverage.walkMinutes - shortestCoverage.walkMinutes,
        blindSpotReduction: shortestBlindSpots - safeBlindSpots,
      });
    }
  }

  const totalCombos = PRESET_PLACES.length * (PRESET_PLACES.length - 1);
  console.log(
    `전체 조합 ${totalCombos}개 중 동일장소 ${skippedSamePlace}개, 경로 없음 ${skippedNoRoute}개 제외 → ${results.length}개 계산 완료\n`
  );

  const candidates = results.filter(
    (r) =>
      r.coverageImprovementPp >= MIN_COVERAGE_IMPROVEMENT_PP &&
      r.timeIncreaseMin <= MAX_TIME_INCREASE_MIN
  );

  console.log(
    `조건(커버리지 개선 ${MIN_COVERAGE_IMPROVEMENT_PP}%p 이상 & 시간 증가 ${MAX_TIME_INCREASE_MIN}분 이내) 충족: ${candidates.length}개\n`
  );

  if (candidates.length === 0) {
    console.log("조건을 만족하는 조합이 없습니다. 임계값을 조정해보세요.");
    return;
  }

  candidates.sort((a, b) => b.coverageImprovementPp - a.coverageImprovementPp);
  const top = candidates.slice(0, TOP_N);

  const header = [
    "출발",
    "도착",
    "최단(분/%)",
    "안심(분/%)",
    "사각구간 감소",
  ];
  const rows = top.map((r) => [
    r.origin.name,
    r.destination.name,
    `${r.shortestMinutes.toFixed(1)}분 / ${r.shortestCoveragePct.toFixed(1)}%`,
    `${r.safeMinutes.toFixed(1)}분 / ${r.safeCoveragePct.toFixed(1)}%`,
    `${r.blindSpotReduction}개 (${r.shortestBlindSpots}→${r.safeBlindSpots})`,
  ]);

  console.log(`상위 ${top.length}개 시연 후보 (커버리지 개선폭 큰 순):\n`);
  printTable(header, rows);
}

main();
