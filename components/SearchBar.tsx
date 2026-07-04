"use client";

import type { PresetPlace } from "@/lib/presets";

interface SearchBarProps {
  places: PresetPlace[];
  originId: string;
  destinationId: string;
  onOriginChange: (id: string) => void;
  onDestinationChange: (id: string) => void;
  onSwap: () => void;
}

export default function SearchBar({
  places,
  originId,
  destinationId,
  onOriginChange,
  onDestinationChange,
  onSwap,
}: SearchBarProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[1500] flex justify-center px-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-3xl border border-white/40 bg-white/80 px-3 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/80">
        <div className="flex flex-1 flex-col divide-y divide-black/10 dark:divide-white/10">
          <PlaceSelect
            label="출발"
            dotColor="#0083FF"
            value={originId}
            placeholder="출발지를 선택하세요"
            places={places}
            onChange={onOriginChange}
          />
          <PlaceSelect
            label="도착"
            dotColor="#4C2CE2"
            value={destinationId}
            placeholder="도착지를 선택하세요"
            places={places}
            onChange={onDestinationChange}
          />
        </div>

        <button
          type="button"
          onClick={onSwap}
          aria-label="출발지와 도착지 바꾸기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0083FF] to-[#4C2CE2] text-white shadow-md active:scale-95"
        >
          ⇅
        </button>
      </div>
    </div>
  );
}

function PlaceSelect({
  label,
  dotColor,
  value,
  placeholder,
  places,
  onChange,
}: {
  label: string;
  dotColor: string;
  value: string;
  placeholder: string;
  places: PresetPlace[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className="w-8 shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent text-sm font-medium text-neutral-900 outline-none dark:text-neutral-100"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {places.map((place) => (
          <option key={place.id} value={place.id}>
            {place.name}
          </option>
        ))}
      </select>
    </div>
  );
}
