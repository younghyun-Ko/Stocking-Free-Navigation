"use client";

import { useEffect, useRef, useState } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const DRAG_CLOSE_THRESHOLD = 100; // px

export default function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);

  useEffect(() => {
    if (open) setDragY(0);
  }, [open]);

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setDragY(Math.max(0, e.clientY - startYRef.current));
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragY > DRAG_CLOSE_THRESHOLD) {
      onClose();
    }
    setDragY(0);
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[2000] flex justify-center transition-transform duration-300 ease-out ${
        open ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"
      }`}
      style={
        open && dragY > 0
          ? { transform: `translateY(${dragY}px)`, transitionDuration: "0ms" }
          : undefined
      }
      aria-hidden={!open}
    >
      <div className="w-full max-w-md rounded-t-3xl border border-white/40 bg-white/80 shadow-[0_-8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/80">
        <div
          className="flex cursor-grab touch-none flex-col items-center pt-2 pb-1 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-1.5 w-10 rounded-full bg-black/20 dark:bg-white/30" />
        </div>
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
