# 혜화동 안심경로 프로토타입

스토킹 등 긴급 상황에서 **CCTV 촬영범위 안으로 경로를 유지**해, 사후에 영상 열람(보관 30일)이
가능한 구간을 최대화하는 안심 길찾기 모바일 웹 + PWA다. 공모전 시연용 프로토타입이며 백엔드/DB
없이 빌드타임 정적 데이터 + 브라우저 내 A* 계산만으로 동작한다.

**서비스 범위는 서울 종로구 혜화동 권역으로 한정**되어 있다 (위도 37.575~37.596, 경도
126.993~127.010 — 혜화동·명륜1~4가·동숭동). 이 범위를 벗어난 지역은 도로망/CCTV/보안등 데이터
자체가 없다.

## 주요 기능

- 프리셋 장소 간 **경로 3종**(최단 / 균형 / 안심) 비교 후 하나를 선택하는 2단계 UI
- 선택한 경로의 CCTV 커버리지 %, 사각구간(CCTV 미기록 구간) 위치와 길이 표시
- 지도 위 CCTV·보안등·지구대(파출소) 위치 표시, CCTV 탭 시 상세정보(촬영방면·보관기간·관리기관 전화)
- 긴급 도움 요청 FAB: 112 전화, 현재 위치 문자 전송, 보호자에게 위치 공유, 가장 가까운 지구대로
  즉시 안내
- PWA: 홈 화면 설치(주소창 없는 standalone 실행), 정적 데이터 오프라인 캐시로 네트워크 불안정 시에도
  경로 계산 가능

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속. `public/data/`에 전처리 산출물이 이미
포함되어 있어 원본 데이터 재가공 없이 바로 실행된다(원본 데이터를 다시 받아 파이프라인을 새로
돌리는 경우는 아래 "전처리 파이프라인" 절 참고).

## PWA 설치 방법

앱을 열고 있는 상태에서:

- **iOS(Safari)**: 하단 공유 버튼 → **홈 화면에 추가**
- **Android(Chrome)**: 자동으로 뜨는 "설치" 배너를 탭하거나, 메뉴(⋮) → **앱 설치** / **홈 화면에
  추가**

설치하면 주소창 없는 standalone 모드로 실행되고, 최초 설치 후 서비스 워커가 그래프/CCTV/보안등
데이터를 캐시해 이후로는 오프라인에서도 경로 계산이 동작한다. 서비스 워커는 **프로덕션 빌드에서만**
동작하므로(`npm run dev` 중에는 등록되지 않음) PWA 동작 확인은 `npm run build && npm start`로
해야 한다. 캐시 전략과 오프라인 동작의 세부 사항, 주의점은 이 문서 맨 아래 "PWA / 오프라인 동작
메모"에 정리했다.

## 데이터 출처

정적 원본 데이터 6종(`raw/`, 원본 파일은 용량/저작권 문제로 git에는 커밋하지 않음)과, 라이브로
받아오는 도로망 데이터로 구성된다.

| # | 파일 | 출처 | 비고 |
|---|---|---|---|
| 1 | 종로구_CCTV_현황_250226.csv | 공공데이터포털(data.go.kr), 종로구 제공 | 목적별 CCTV 위치, 촬영방면, 보관일수 등 |
| 2 | 종로구_보안등_현황_250225.xlsx | 공공데이터포털(data.go.kr), 종로구 제공 | 보안등 위치(WGS84) |
| 3 | 서울시 가로등 위치 정보.csv | 서울 열린데이터광장(data.seoul.go.kr) | 지하차도·고가 시설 가로등 위주 (아래 검토 기록 참고) |
| 4~6 | 자치구별 CCTV 통계 3종 (목적별/연도별/지능형) | 서울 열린데이터광장(data.seoul.go.kr) | 발표·인트로 통계 카드(`stats.json`) 소스 |
| - | 도로망(보행 네트워크) | OpenStreetMap, `osmnx`로 실시간 다운로드 | `raw/`에 저장되지 않고 전처리 시점에 API로 직접 수신 |

### 데이터 검토 기록 (심사 질의 대비)

> **서울시 가로등 위치 정보는 지하차도·고가 시설 가로등 위주로 혜화 권역 0건이라 안전점수에는
> 종로구 보안등(1,806개)만 반영**했다. 파이프라인(`scripts/03_process_lights.py`)은 가로등
> 데이터 병합을 시도하되, 혜화 bbox 내 0건이면 에러 없이 로그만 남기고 통과하도록 방어적으로
> 작성되어 있다 — 추후 다른 지역으로 서비스를 확장해 가로등이 실제로 존재하는 경우를 대비한
> 설계다.

그 밖에 사전 검증된 원본 데이터 스펙(인코딩, 컬럼 구조, 혜화 bbox 내 건수 등)은
[CLAUDE.md](CLAUDE.md)에 정리되어 있다.

## 전처리 파이프라인 재실행

원본 데이터(`raw/`)가 갱신됐을 때만 다시 돌리면 된다. Python 가상환경 준비:

```bash
python -m venv venv
./venv/Scripts/pip install -r requirements.txt   # Windows
# source venv/bin/activate && pip install -r requirements.txt   # macOS/Linux
```

스크립트는 **아래 순서로** 실행한다(뒤 단계가 앞 단계 산출물을 읽으므로 순서가 중요하다):

```bash
./venv/Scripts/python.exe scripts/02_process_cctv.py     # raw CCTV -> public/data/cctv.geojson
./venv/Scripts/python.exe scripts/01_extract_roads.py    # OSM 보행망 -> public/data/roads.geojson
./venv/Scripts/python.exe scripts/03_process_lights.py   # 보안등+가로등 -> public/data/lights.geojson
./venv/Scripts/python.exe scripts/06_extract_stats.py    # 서울시 통계 3종 -> public/data/stats.json
./venv/Scripts/python.exe scripts/04_build_graph.py      # roads+cctv+lights -> public/data/graph.json (안전점수 계산)
```

`scripts/05_validate_map.py`는 위 산출물을 folium 지도(`scripts/validate_all.html`)로 시각
검증하는 선택 단계다.

## 시연 시나리오

프리셋 장소 8곳의 모든 출발↔도착 조합 중 "커버리지 개선폭이 크고(15%p 이상) 시간 증가는 3분
이내"인 조합을 찾는 스크립트가 있다:

```bash
npm run check-demo
```

이 스크립트는 `scripts/find_demo_routes.ts`를 그대로 실행하며, graph.json이 정상 로드되고
A* 계산이 여전히 유효한 결과를 내는지도 함께 확인할 수 있어 **시연 직전 최종 점검 용도로도
그대로 쓴다**. 현재 기준 상위 후보:

| 출발 | 도착 | 최단 | 안심(추천) | 비고 |
|---|---|---|---|---|
| 혜화동주민센터 | 혜화역 4번출구 | 8.1분 · 28.1% | 8.3분 · 63.5% | 시간은 +0.2분뿐인데 커버리지가 2배 이상 — 가장 극적인 시연용 |
| 혜화역 3번출구 | 마로니에공원 | 2.7분 · 68.7% | 3.0분 · 95.1% | 짧고 안정적, "완전 커버리지"를 보여주기 좋음 |

> ⚠️ 프리셋 좌표(`lib/presets.ts`)는 전부 `needsVerification: true`로 표시된 대략 위치다.
> 실좌표로 교체하면 위 수치가 달라질 수 있으니, 시연 전에 `npm run check-demo`로 다시 확인할 것.

시연 중 네트워크가 끊겨도 대비할 수 있도록, 위 조합으로 한 번 이상 온라인 상태에서 앱을 미리
열어봐서 서비스 워커 캐시를 채워두는 것을 권장한다 (아래 "PWA / 오프라인 동작 메모" 참고).

---

## 개발자 노트

### 위치 권한(Geolocation) 테스트 메모

긴급 도움 요청 기능(`components/EmergencyButton.tsx`)은 `navigator.geolocation`을 사용한다.
Geolocation API는 "보안 컨텍스트"에서만 동작하는데, 브라우저는 `http://localhost`(및
`http://127.0.0.1`)를 예외적으로 보안 컨텍스트로 취급하므로 **로컬 개발 중에는 HTTPS 없이도
정상 동작**한다.

- `npm run dev` 후 데스크톱 브라우저에서 `http://localhost:3000`으로 접속 → 위치 권한 프롬프트가
  정상적으로 뜬다.
- 다만 **같은 네트워크의 휴대폰 등 다른 기기에서 `http://<사설IP>:3000`으로 접속하면 보안
  컨텍스트가 아니라서 Geolocation이 거부**된다. 실제 모바일 기기로 확인하려면:
  - `ngrok http 3000` 등으로 HTTPS 터널을 열어 그 주소로 접속하거나,
  - `next dev --experimental-https`로 로컬 자체서명 인증서를 띄우고 인증서 경고를 수락하거나,
  - Chrome이라면 `chrome://flags/#unsafely-treat-insecure-origin-as-secure`에 사설 IP를
    등록해 임시로 신뢰하는 방법도 있다(개발용 우회이므로 배포 환경에서는 반드시 HTTPS를 쓸 것).
- 위치 권한을 거부하거나 위치를 가져오지 못하면, 앱은 지도 중심 좌표를 "현재 위치"로 대신
  사용하는 폴백으로 동작한다(정확한 현재 위치가 아니라는 점을 사용자에게 토스트로 안내한다).

### PWA / 오프라인 동작 메모

이 앱은 홈 화면 설치(standalone)와 정적 데이터(그래프/geojson) 오프라인 캐시를 지원한다.
서비스 워커(`public/sw.js`)는 **프로덕션 빌드에서만** 등록된다(`npm run dev` 중에는
`components/ServiceWorkerRegister.tsx`가 등록을 건너뛰고, 오히려 기존에 등록된 SW가 있으면
해제해 캐시가 꼬이지 않게 한다). 그래서 PWA 동작 확인은 반드시 아래처럼 프로덕션 모드로 해야 한다.

```bash
npm run build
npm start          # 포트가 3000이 아니면: npx next start -p <포트>
```

**캐시 전략**:
- `precache-v2`: `graph.json`/`cctv.geojson`/`lights.geojson`/`police.geojson`/`stats.json`을
  SW 설치 시점에 미리 캐시(cache-first로 서빙) — 오프라인에서도 경로 계산(A*)이 항상 동작한다.
  이 파일들은 `next.config.mjs`의 `headers()`에서 `Cache-Control: public, max-age=300,
  stale-while-revalidate=3600`도 함께 받는다 — 콘텐츠 해시가 없는 파일이라 immutable은
  피했고, 서비스 워커가 이미 precache로 오프라인/반복 방문을 담당하므로 이 헤더는 주로 PWA
  미설치 사용자의 첫 방문·재방문 속도에만 영향을 준다(서로 충돌하지 않음).
- `tiles-v2`: 지도 타일(CartoDB Positron, `basemaps.cartocdn.com`)은 stale-while-revalidate +
  최대 200개 항목으로 런타임 캐시(타일까지 미리 캐시하면 용량이 급증하므로 절대 precache하지
  않는다).
- `shell-v2`: 앱 셸(HTML/JS/CSS)은 network-first — 온라인이면 항상 최신을 받고, 실패할 때만
  캐시로 대체한다.

**중요 - "이미 방문한 영역"의 의미**: network-first 전략 특성상 앱 셸은 서비스 워커가 실제로
그 요청을 가로챈 이후에만 캐시에 쌓인다. 즉 **최초 1회 방문(설치) 직후 바로 오프라인으로
전환하면 페이지 자체가 뜨지 않을 수 있다** — 시연 전에는 최소 한 번 온라인 상태로 앱을 열고
새로고침까지 해봐서 앱 셸이 캐시에 쌓였는지 확인해두는 게 안전하다(Chrome DevTools →
Application → Cache Storage에서 `shell-v2`에 `/`, `/_next/static/...` 항목이 보이면 준비 완료).
그 다음부터는 오프라인에서도 프리셋 선택 → 경로 계산 → 경로 선택 플로우가 정상 동작한다(지도
타일 이미지만 이전에 본 적 없는 영역에서는 빈 회색으로 보일 수 있음 - 의도된 동작).

Lighthouse PWA 카테고리는 v12+에서 완전히 제거되어(`accessibility`, `best-practices`,
`performance`, `seo`만 남음), installable 여부를 확인하려면 `npx lighthouse@11`처럼 이전
버전을 써야 한다.

### 성능 메모

프로덕션 빌드 기준 Lighthouse 모바일 성능 점수는 약 0.74. LCP(최대 콘텐츠풀 페인트)만 약
6.3초로 낮은데(score 0.1), 원인은 지도 타일 이미지 — Leaflet 지도는 `ssr:false`로 클라이언트
전용 렌더링이라 JS 하이드레이션이 끝나야 타일 요청이 시작되는 구조적 특성 때문이다.
`app/layout.tsx`에 타일 CDN preconnect를 추가해 저비용으로 완화를 시도했으나 실측상 큰 개선은
없었다 — 근본적으로 해결하려면 지도 렌더링 구조 자체를 바꿔야 해서(이미지/번들 최적화 범위를
벗어남) 현재는 원인만 문서화해두고 보류한 상태다.
