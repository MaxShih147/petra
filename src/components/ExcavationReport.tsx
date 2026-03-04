"use client";

import { Fossil } from "@/types/fossil";
import { motion, AnimatePresence } from "framer-motion";

interface ExcavationReportProps {
  fossil: Fossil | null;
  onClose: () => void;
}

export default function ExcavationReport({
  fossil,
  onClose,
}: ExcavationReportProps) {
  return (
    <AnimatePresence>
      {fossil && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 bg-petra-sepia/20 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Report Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute top-0 right-0 z-30 h-full w-full max-w-md bg-petra-parchment border-l-2 border-petra-sand shadow-report overflow-y-auto"
          >
            {/* Paper texture overlay */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjY1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIi8+PC9zdmc+')] bg-repeat" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-40 w-8 h-8 flex items-center justify-center rounded-full bg-petra-bone border border-petra-sand hover:bg-petra-sand transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-petra-sepia"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="relative p-8 pt-6">
              {/* Report Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-body text-[10px] text-petra-sienna uppercase tracking-[0.2em] border border-petra-sienna/30 px-2 py-0.5 rounded">
                    Excavation Report
                  </span>
                  <span className="font-body text-[10px] text-petra-fossil uppercase tracking-wider">
                    {fossil.id}
                  </span>
                </div>

                <h2 className="font-display text-3xl text-petra-sepia leading-tight mb-1">
                  <em>{fossil.name}</em>
                </h2>
                <p className="font-body text-sm text-petra-fossil">
                  &ldquo;{fossil.commonName}&rdquo;
                </p>
              </div>

              {/* Decorative divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-petra-sand" />
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-petra-sienna">
                  <path
                    d="M10 2L12 8H18L13 12L15 18L10 14L5 18L7 12L2 8H8Z"
                    fill="currentColor"
                    opacity="0.4"
                  />
                </svg>
                <div className="flex-1 h-px bg-petra-sand" />
              </div>

              {/* Specimen Illustration */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mb-8 flex justify-center"
              >
                <div className="w-48 h-48 bg-petra-bone/50 border border-petra-sand rounded-lg flex items-center justify-center relative">
                  <svg viewBox="0 0 80 100" className="w-32 h-32">
                    <path
                      d={fossil.silhouette}
                      fill="none"
                      stroke="#3E2723"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Dotted reconstruction lines */}
                    <path
                      d={fossil.silhouette}
                      fill="rgba(139, 90, 43, 0.08)"
                      stroke="none"
                    />
                  </svg>
                  {/* Frame corners */}
                  <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-petra-sienna/30" />
                  <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-petra-sienna/30" />
                  <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-petra-sienna/30" />
                  <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-petra-sienna/30" />
                </div>
              </motion.div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <DataField label="Geological Period" value={fossil.period} />
                <DataField label="Age" value={fossil.age} />
                <DataField label="Formation" value={fossil.formation} />
                <DataField
                  label="Coordinates"
                  value={`${fossil.coords[1].toFixed(1)}°${fossil.coords[1] >= 0 ? "N" : "S"}, ${Math.abs(fossil.coords[0]).toFixed(1)}°${fossil.coords[0] >= 0 ? "E" : "W"}`}
                />
              </div>

              {/* Summary */}
              <div className="mb-8">
                <h3 className="font-display text-sm text-petra-sienna uppercase tracking-wider mb-3">
                  Field Notes
                </h3>
                <p className="font-body text-sm text-petra-sepia/90 leading-relaxed">
                  {fossil.summary}
                </p>
              </div>

              {/* Decorative footer */}
              <div className="flex items-center gap-3 pt-4 border-t border-petra-sand/60">
                <div className="flex-1" />
                <span className="font-display text-[10px] text-petra-fossil/50 italic tracking-wider">
                  PETRA — The Fossil Atlas
                </span>
                <div className="flex-1" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-petra-bone/40 border border-petra-sand/50 rounded px-3 py-2.5">
      <span className="font-body text-[10px] text-petra-fossil uppercase tracking-wider block mb-0.5">
        {label}
      </span>
      <span className="font-display text-sm text-petra-sepia font-medium">
        {value}
      </span>
    </div>
  );
}
