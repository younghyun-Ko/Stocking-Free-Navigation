"use client";

import { useEffect, useState } from "react";

const VISIBLE_MS = 3000;

interface Stats {
  district: string;
  totalCctv: number;
  smartRatio: number;
  retentionDays: number;
}

export default function Onboarding() {
  const [visible, setVisible] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/data/stats.json")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[3000] flex justify-center px-4 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ top: "max(6.5rem, calc(env(safe-area-inset-top) + 5.5rem))" }}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/40 bg-white/80 px-5 py-4 text-center shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <p className="text-sm font-bold text-neutral-900">
          CCTV가 지켜보는 길로 안내합니다
        </p>
        {stats && (
          <p className="mt-1.5 text-xs text-neutral-500">
            {stats.district} CCTV {stats.totalCctv.toLocaleString()}대 ·{" "}
            {stats.smartRatio >= 1 ? "전량" : `${Math.round(stats.smartRatio * 100)}%`} 지능형
            관제 · 영상 보관 {stats.retentionDays}일
          </p>
        )}
      </div>
    </div>
  );
}
