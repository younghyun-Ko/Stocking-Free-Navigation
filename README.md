This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
- `precache-v1`: `graph.json`/`cctv.geojson`/`lights.geojson`/`police.geojson`/`stats.json`을
  SW 설치 시점에 미리 캐시(cache-first로 서빙) — 오프라인에서도 경로 계산(A*)이 항상 동작한다.
- `tiles-v1`: OSM 지도 타일은 stale-while-revalidate + 최대 200개 항목으로 런타임 캐시(타일까지
  미리 캐시하면 용량이 급증하므로 절대 precache하지 않는다).
- `shell-v1`: 앱 셸(HTML/JS/CSS)은 network-first — 온라인이면 항상 최신을 받고, 실패할 때만
  캐시로 대체한다.

**중요 - "이미 방문한 영역"의 의미**: network-first 전략 특성상 앱 셸은 서비스 워커가 실제로
그 요청을 가로챈 이후에만 캐시에 쌓인다. 즉 **최초 1회 방문(설치) 직후 바로 오프라인으로
전환하면 페이지 자체가 뜨지 않을 수 있다** — 시연 전에는 최소 한 번 온라인 상태로 앱을 열고
새로고침까지 해봐서 앱 셸이 캐시에 쌓였는지 확인해두는 게 안전하다(Chrome DevTools →
Application → Cache Storage에서 `shell-v1`에 `/`, `/_next/static/...` 항목이 보이면 준비 완료).
그 다음부터는 오프라인에서도 프리셋 선택 → 경로 계산 → 경로 선택 플로우가 정상 동작한다(지도
타일 이미지만 이전에 본 적 없는 영역에서는 빈 회색으로 보일 수 있음 - 의도된 동작).

Lighthouse PWA 카테고리는 v12+에서 완전히 제거되어(`accessibility`, `best-practices`,
`performance`, `seo`만 남음), installable 여부를 확인하려면 `npx lighthouse@11`처럼 이전
버전을 써야 한다.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
