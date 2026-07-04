"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="fixed inset-0 h-dvh w-dvw overflow-hidden">
      <MapView />
    </main>
  );
}
