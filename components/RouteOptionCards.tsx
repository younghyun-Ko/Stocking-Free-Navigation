"use client";

import { routeCoverage } from "@/lib/coverage";
import type { RenderableRoute, RouteKey } from "@/lib/useRoutes";

interface RouteOptionCardsProps {
  routes: RenderableRoute[];
  onSelect: (key: RouteKey) => void;
}

export default function RouteOptionCards({ routes, onSelect }: RouteOptionCardsProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1500] flex justify-center px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex w-full max-w-md gap-2 overflow-x-auto">
        {routes.map((route) => {
          const coverage = routeCoverage(route.result.edges);
          const isSafe = route.key === "safe";
          return (
            <button
              key={route.key}
              type="button"
              onClick={() => onSelect(route.key)}
              className={`flex shrink-0 flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left shadow-[0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-xl transition active:scale-95 ${
                isSafe
                  ? "border-white/40 bg-gradient-to-br from-[#0083FF] to-[#4C2CE2] text-white"
                  : "border-white/40 bg-white/85 text-neutral-900 dark:border-white/10 dark:bg-neutral-900/85 dark:text-neutral-100"
              }`}
            >
              <span className="text-xs font-semibold opacity-80">{route.label}</span>
              <span className="text-base font-bold">{Math.round(coverage.walkMinutes)}분</span>
              <span className="text-xs opacity-80">
                CCTV {Math.round(coverage.avgCoverage * 100)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
