/**
 * navigator.geolocation.getCurrentPosition을 Promise로 감싼다.
 * Geolocation은 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작한다 - README 참고.
 */
export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("이 브라우저는 위치 확인을 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    });
  });
}
