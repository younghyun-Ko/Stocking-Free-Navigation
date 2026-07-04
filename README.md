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
