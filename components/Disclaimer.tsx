"use client";

export default function Disclaimer() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[1400] flex justify-center pb-[env(safe-area-inset-bottom)]"
      aria-hidden={false}
    >
      <p className="px-4 py-1 text-center text-[10px] leading-tight text-neutral-500/90">
        본 경로는 CCTV 설치 정보 기반 참고용이며 안전을 보장하지 않습니다
      </p>
    </div>
  );
}
