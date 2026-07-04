"use client";

import { useEffect } from "react";

/**
 * 프로덕션 빌드에서만 서비스 워커를 등록한다. 개발 모드(next dev)에서는 등록하지 않고,
 * 오히려 이전에 등록된 서비스 워커가 있으면 해제해 핫리로드 중 캐시가 꼬이는 걸 막는다.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("서비스 워커 등록 실패:", err);
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    }
  }, []);

  return null;
}
