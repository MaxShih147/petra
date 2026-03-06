"use client";

import { useCallback, useRef, useState } from "react";

// Major geological periods with ICS colors (oldest first)
const GEO_PERIODS = [
  { name: "Triassic", abbr: "T", from: 252, to: 201, color: "#812B92" },
  { name: "Jurassic", abbr: "J", from: 201, to: 145, color: "#34B2C9" },
  { name: "Cretaceous", abbr: "K", from: 145, to: 66, color: "#7FC64E" },
  { name: "Paleogene", abbr: "Pg", from: 66, to: 23, color: "#FD9A52" },
  { name: "Neogene", abbr: "N", from: 23, to: 2.6, color: "#FFE619" },
  { name: "Quaternary", abbr: "Q", from: 2.6, to: 0, color: "#F9F97F" },
];

const TOTAL_MAX = 252;
const TOTAL_MIN = 0;

interface TimeSliderProps {
  rangeMax: number;
  rangeMin: number;
  onChange: (max: number, min: number) => void;
}

export default function TimeSlider({
  rangeMax,
  rangeMin,
  onChange,
}: TimeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"max" | "min" | null>(null);

  const maToPercent = (ma: number) =>
    ((TOTAL_MAX - ma) / (TOTAL_MAX - TOTAL_MIN)) * 100;

  const percentToMa = (pct: number) =>
    TOTAL_MAX - (pct / 100) * (TOTAL_MAX - TOTAL_MIN);

  const getPercentFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    []
  );

  const handlePointerDown = useCallback(
    (handle: "max" | "min") => (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(handle);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const pct = getPercentFromEvent(e.clientX);
      const ma = Math.round(percentToMa(pct));

      if (dragging === "max") {
        // Allow crossing: if dragged past min, swap roles
        if (ma < rangeMin) {
          setDragging("min");
          onChange(rangeMin, Math.max(ma, TOTAL_MIN));
        } else {
          onChange(Math.min(ma, TOTAL_MAX), rangeMin);
        }
      } else {
        // Allow crossing: if dragged past max, swap roles
        if (ma > rangeMax) {
          setDragging("max");
          onChange(Math.min(ma, TOTAL_MAX), rangeMax);
        } else {
          onChange(rangeMax, Math.max(ma, TOTAL_MIN));
        }
      }
    },
    [dragging, rangeMax, rangeMin, onChange, getPercentFromEvent]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Click on track to jump nearest handle
  const handleTrackClick = useCallback(
    (e: React.PointerEvent) => {
      if (dragging) return;
      const pct = getPercentFromEvent(e.clientX);
      const ma = Math.round(percentToMa(pct));
      const distMax = Math.abs(ma - rangeMax);
      const distMin = Math.abs(ma - rangeMin);
      if (distMax <= distMin) {
        onChange(Math.min(Math.max(ma, rangeMin), TOTAL_MAX), rangeMin);
      } else {
        onChange(rangeMax, Math.max(Math.min(ma, rangeMax), TOTAL_MIN));
      }
    },
    [dragging, rangeMax, rangeMin, onChange, getPercentFromEvent]
  );

  const leftPct = maToPercent(rangeMax);
  const rightPct = maToPercent(rangeMin);

  return (
    <div className="w-full select-none">
      {/* Track with integrated labels */}
      <div
        ref={trackRef}
        className="relative h-8 cursor-pointer touch-none"
        onPointerDown={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Geological period colors */}
        <div className="absolute inset-0 rounded-full overflow-hidden flex">
          {GEO_PERIODS.map((p) => {
            const width =
              ((p.from - p.to) / (TOTAL_MAX - TOTAL_MIN)) * 100;
            return (
              <div
                key={p.name}
                className="h-full"
                style={{ width: `${width}%`, backgroundColor: p.color, opacity: 0.5 }}
                title={p.name}
              />
            );
          })}
        </div>

        {/* Period labels — positioned at center of each period, independent of width */}
        <div className="absolute inset-0 pointer-events-none">
          {GEO_PERIODS.map((p) => {
            const width =
              ((p.from - p.to) / (TOTAL_MAX - TOTAL_MIN)) * 100;
            const centerPct = maToPercent((p.from + p.to) / 2);
            return (
              <span
                key={p.name}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 font-body text-[7px] text-petra-sepia/80 font-medium whitespace-nowrap"
                style={{ left: `${centerPct}%` }}
              >
                {width > 15 ? p.name : p.abbr}
              </span>
            );
          })}
        </div>

        {/* Active range highlight */}
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            left: `${leftPct}%`,
            width: `${rightPct - leftPct}%`,
            background: "rgba(139, 90, 43, 0.25)",
            boxShadow: "inset 0 0 0 1.5px rgba(139, 90, 43, 0.5)",
          }}
        />

        {/* Dimmed areas outside range */}
        <div
          className="absolute top-0 h-full bg-petra-parchment/70 rounded-l-full"
          style={{ left: 0, width: `${leftPct}%` }}
        />
        <div
          className="absolute top-0 h-full bg-petra-parchment/70 rounded-r-full"
          style={{ left: `${rightPct}%`, width: `${100 - rightPct}%` }}
        />

        {/* Max handle (older / left) — last dragged gets higher z */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-petra-sienna bg-petra-parchment shadow-sm cursor-grab transition-transform ${
            dragging === "max" ? "scale-125 cursor-grabbing" : "hover:scale-110"
          }`}
          style={{ left: `${leftPct}%`, zIndex: dragging === "max" ? 20 : 10 }}
          onPointerDown={handlePointerDown("max")}
        />

        {/* Min handle (recent / right) */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-petra-sienna bg-petra-parchment shadow-sm cursor-grab transition-transform ${
            dragging === "min" ? "scale-125 cursor-grabbing" : "hover:scale-110"
          }`}
          style={{ left: `${rightPct}%`, zIndex: dragging === "min" ? 20 : 10 }}
          onPointerDown={handlePointerDown("min")}
        />
      </div>

      {/* Range labels */}
      <div className="flex justify-between mt-1.5">
        <span className="font-body text-[10px] text-petra-fossil">
          {rangeMax.toFixed(0)} Ma
        </span>
        <span className="font-body text-[10px] text-petra-fossil">
          {rangeMin.toFixed(0)} Ma
        </span>
      </div>
    </div>
  );
}
