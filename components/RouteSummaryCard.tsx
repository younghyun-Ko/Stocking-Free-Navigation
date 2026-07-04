"use client";

import type { CctvFeature } from "@/lib/cctv";
import { cctvNearRoute, findBlindSpots, routeCoverage } from "@/lib/coverage";
import type { RenderableRoute } from "@/lib/useRoutes";

const ROUTE_FILTER_BUFFER_M = 50;
const BLIND_SPOT_RED = "#E11D48";

interface RouteSummaryCardProps {
  route: RenderableRoute;
  cctvFeatures: CctvFeature[];
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
    </div>
  );
}

export default function RouteSummaryCard({ route, cctvFeatures }: RouteSummaryCardProps) {
  const coverage = routeCoverage(route.result.edges);
  const blindSpots = findBlindSpots(route.result.edges);
  const nearRouteMask = cctvNearRoute(
    route.result.edges,
    cctvFeatures.map((f) => f.geometry.coordinates),
    ROUTE_FILTER_BUFFER_M
  );
  const cctvCount = nearRouteMask.filter(Boolean).length;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1500] flex justify-center px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/40 bg-white/85 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/85">
        <span className="mb-3 inline-block rounded-full bg-gradient-to-r from-[#0083FF] to-[#4C2CE2] px-3 py-1 text-xs font-bold text-white">
          {route.label} 경로
        </span>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <SummaryItem label="시간" value={`${Math.round(coverage.walkMinutes)}분`} />
          <SummaryItem label="거리" value={`${Math.round(coverage.totalLength)}m`} />
          <SummaryItem
            label="CCTV 커버리지"
            value={`${Math.round(coverage.avgCoverage * 100)}%`}
          />
          <SummaryItem label="경로상 CCTV" value={`${cctvCount}대`} />
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <span aria-hidden>⚠️</span>
          <span
            className="font-semibold"
            style={{ color: blindSpots.length > 0 ? BLIND_SPOT_RED : undefined }}
          >
            사각구간 {blindSpots.length}개
          </span>
        </div>
      </div>
    </div>
  );
}
