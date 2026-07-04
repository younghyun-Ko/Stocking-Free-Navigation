export interface PresetPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 실측 좌표 미확인 - 대략 위치. 확보되는 대로 교체 필요 */
  needsVerification: true;
}

// 아래 좌표는 모두 대략값(needsVerification)이다. 혜화역 2번출구/성균관대 정문은
// 이전 라우팅 테스트(scripts/test_route.ts)에 쓰인 값을 그대로 가져왔고, 나머지는
// 혜화역 로터리를 기준으로 방위를 추정해 채운 자리표시자다. 실좌표 확보 후 교체할 것.
export const PRESET_PLACES: PresetPlace[] = [
  { id: "hyehwa-exit1", name: "혜화역 1번출구", lat: 37.5828, lng: 127.0016, needsVerification: true },
  { id: "hyehwa-exit2", name: "혜화역 2번출구", lat: 37.5823, lng: 127.0019, needsVerification: true },
  { id: "hyehwa-exit3", name: "혜화역 3번출구", lat: 37.582, lng: 127.0014, needsVerification: true },
  { id: "hyehwa-exit4", name: "혜화역 4번출구", lat: 37.5825, lng: 127.001, needsVerification: true },
  { id: "skku-main-gate", name: "성균관대 정문", lat: 37.588, lng: 126.9937, needsVerification: true },
  { id: "marronnier-park", name: "마로니에공원", lat: 37.5824, lng: 127.0027, needsVerification: true },
  {
    id: "hyehwa-community-center",
    name: "혜화동주민센터",
    lat: 37.5865,
    lng: 127.002,
    needsVerification: true,
  },
  {
    id: "naksan-park-entrance",
    name: "낙산공원 입구",
    lat: 37.5807,
    lng: 127.0075,
    needsVerification: true,
  },
];
