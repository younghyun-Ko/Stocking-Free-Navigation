"use client";

export default function LoadingIndicator() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[3500] flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-3xl border border-white/40 bg-white/80 px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <span
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-neutral-300 border-t-[#0083FF]"
          aria-hidden
        />
        <span className="text-sm font-medium text-neutral-700">안전 데이터 불러오는 중...</span>
      </div>
    </div>
  );
}
