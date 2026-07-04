/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // public/data/*.geojson, graph.json, stats.json 등 전처리 산출물.
        // 콘텐츠 해시가 없는 정적 파일이라 immutable은 위험하고(스크립트 재실행 시 갱신 안 될 수 있음),
        // 서비스 워커의 precache(cache-first)가 오프라인/반복 방문을 이미 담당하므로
        // 여기서는 짧은 max-age + stale-while-revalidate로 첫 방문/PWA 미설치 사용자만 커버한다.
        source: "/data/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=3600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
