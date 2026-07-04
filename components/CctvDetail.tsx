"use client";

import type { CctvFeature } from "@/lib/cctv";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="text-right font-medium text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

export default function CctvDetail({ feature }: { feature: CctvFeature }) {
  const {
    purpose,
    direction,
    resolution,
    cameraCount,
    retentionDays,
    lotAddress,
    agency,
    agencyPhone,
  } = feature.properties;

  return (
    <div className="pb-2">
      <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{purpose}용 CCTV</h2>

      <dl className="mt-4 space-y-3 text-sm">
        <Row label="촬영방면" value={direction} />
        <Row label="화소수" value={`${resolution}만 화소`} />
        <Row label="카메라 대수" value={`${cameraCount}대`} />
        <Row
          label="영상보관"
          value={
            retentionDays != null ? `${retentionDays}일 (열람요청 가능 기한)` : "정보 없음"
          }
        />
        <Row label="설치위치" value={lotAddress} />
        <Row label="관리기관" value={agency} />
      </dl>

      {agencyPhone && (
        <a
          href={`tel:${agencyPhone}`}
          className="mt-5 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0083FF] to-[#4C2CE2] py-3 text-base font-semibold text-white shadow-md active:opacity-90"
        >
          관리기관에 전화하기 ({agencyPhone})
        </a>
      )}
    </div>
  );
}
