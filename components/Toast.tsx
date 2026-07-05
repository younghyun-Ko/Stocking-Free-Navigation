"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[3200] flex justify-center transition-all duration-300 ${
        message ? "opacity-100" : "-translate-y-4 opacity-0"
      }`}
      style={{ top: "max(6.5rem, calc(env(safe-area-inset-top) + 5.5rem))" }}
    >
      {message && (
        <div className="rounded-full border border-white/15 bg-neutral-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl">
          {message}
        </div>
      )}
    </div>
  );
}
