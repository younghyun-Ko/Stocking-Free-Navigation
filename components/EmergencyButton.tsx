"use client";

import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { getCurrentPosition } from "@/lib/geolocation";
import { findNearestPolice, type PoliceFeature } from "@/lib/police";
import type { RoutePoint } from "@/lib/useRoutes";

interface EmergencyButtonProps {
  policeFeatures: PoliceFeature[];
  mapCenter: { lat: number; lng: number };
  onRouteToPolice: (origin: RoutePoint, destination: RoutePoint) => void;
  onBeforeOpen: () => void;
  onToast: (message: string) => void;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function kakaoMapLink(lat: number, lng: number): string {
  return `https://map.kakao.com/link/map/현재위치,${lat},${lng}`;
}

export default function EmergencyButton({
  policeFeatures,
  mapCenter,
  onRouteToPolice,
  onBeforeOpen,
  onToast,
}: EmergencyButtonProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmingCall, setConfirmingCall] = useState(false);
  const [busy, setBusy] = useState(false);

  const openSheet = () => {
    onBeforeOpen();
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setConfirmingCall(false);
  };

  const handleConfirmCall = () => {
    window.location.href = "tel:112";
    closeSheet();
  };

  const handleSendSms = async () => {
    setBusy(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const body = `긴급상황입니다. 현재 위치: ${kakaoMapLink(latitude, longitude)}`;
      // iOS의 sms: URI는 '&'로, 그 외(Android 등)는 '?'로 첫 파라미터를 구분한다.
      const separator = isIOS() ? "&" : "?";
      window.location.href = `sms:${separator}body=${encodeURIComponent(body)}`;
      closeSheet();
    } catch {
      onToast("위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const handleShareLocation = async () => {
    setBusy(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const url = kakaoMapLink(latitude, longitude);
      const shareData = {
        title: "긴급 위치 공유",
        text: "긴급상황입니다. 현재 위치를 확인해주세요.",
        url,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        closeSheet();
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.text} ${url}`);
        onToast("위치 링크를 클립보드에 복사했습니다.");
        closeSheet();
      } else {
        onToast("이 브라우저는 공유를 지원하지 않습니다.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // 사용자가 공유 시트를 취소한 경우 - 에러 아님
        return;
      }
      onToast("위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const handleRouteToPolice = async () => {
    setBusy(true);
    try {
      if (policeFeatures.length === 0) {
        onToast("지구대 정보를 불러오지 못했습니다.");
        return;
      }

      let origin: RoutePoint;
      try {
        const position = await getCurrentPosition();
        origin = {
          id: "current-location",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch {
        origin = { id: "current-location", lat: mapCenter.lat, lng: mapCenter.lng };
        onToast("위치 권한이 없어 지도 중심을 현재 위치로 사용합니다.");
      }

      const destination = findNearestPolice(policeFeatures, origin.lat, origin.lng);
      if (!destination) {
        onToast("가까운 지구대를 찾을 수 없습니다.");
        return;
      }

      onRouteToPolice(origin, destination);
      closeSheet();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label="긴급 도움 요청"
        className="fixed z-[4000] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#EF4444] to-[#B91C1C] text-2xl text-white shadow-[0_6px_20px_rgba(185,28,28,0.5)] active:scale-95"
        style={{
          right: "max(1rem, env(safe-area-inset-right))",
          bottom: "max(6.5rem, calc(env(safe-area-inset-bottom) + 5.5rem))",
        }}
      >
        🚨
      </button>

      <BottomSheet open={sheetOpen} onClose={closeSheet}>
        {confirmingCall ? (
          <div className="pb-2">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              112에 전화를 겁니다
            </h2>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              신고 전화가 바로 연결됩니다. 계속할까요?
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingCall(false)}
                className="flex-1 rounded-2xl bg-neutral-200 py-3 text-base font-semibold text-neutral-900 active:opacity-80 dark:bg-neutral-800 dark:text-neutral-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmCall}
                className="flex-1 rounded-2xl bg-gradient-to-r from-[#EF4444] to-[#B91C1C] py-3 text-base font-semibold text-white active:opacity-90"
              >
                112 전화하기
              </button>
            </div>
          </div>
        ) : (
          <div className="pb-2">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">긴급 도움 요청</h2>

            <div className="mt-4 flex flex-col gap-2">
              <EmergencyAction
                icon="📞"
                label="112 전화하기"
                onClick={() => setConfirmingCall(true)}
                disabled={busy}
              />
              <EmergencyAction
                icon="💬"
                label="현재 위치 문자로 보내기"
                onClick={handleSendSms}
                disabled={busy}
              />
              <EmergencyAction
                icon="📍"
                label="보호자에게 위치 공유"
                onClick={handleShareLocation}
                disabled={busy}
              />
              <EmergencyAction
                icon="🚔"
                label="가까운 지구대로 안내"
                onClick={handleRouteToPolice}
                disabled={busy}
              />
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function EmergencyAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 items-center gap-3 rounded-2xl bg-neutral-100 px-4 py-3 text-left text-base font-medium text-neutral-900 active:opacity-80 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100"
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}
