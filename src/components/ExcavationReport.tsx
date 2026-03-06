"use client";

import { useState } from "react";
import { Fossil } from "@/types/fossil";
import { motion, AnimatePresence } from "framer-motion";
import { useDinoImage } from "@/lib/imageResolver";

interface ExcavationReportProps {
  fossil: Fossil | null;
  onClose: () => void;
}

// ICS standard colors (from International Commission on Stratigraphy via PBDB)
const PERIOD_COLORS: Record<string, string> = {
  Maastrichtian: "#F2FA8C",
  Campanian: "#E6F47F",
  Cenomanian: "#B3DE53",
  Kimmeridgian: "#CCECF4",
  Tithonian: "#D9F1F7",
  Barremian: "#B3DF7F",
  Aptian: "#BFE48A",
  Albian: "#CCEA97",
  Turonian: "#BFE35D",
  Santonian: "#D9EF74",
  Norian: "#D6AAD3",
  Carnian: "#C99BCB",
  Bajocian: "#A6DDE0",
  Bathonian: "#B3E2E3",
  Oxfordian: "#BFE7F1",
  Valanginian: "#99D36A",
  Hauterivian: "#A6D975",
};

const GROUP_SILHOUETTE_COLORS: Record<string, string> = {
  theropod: "#B44D2E",
  sauropod: "#6B8E23",
  ceratopsian: "#8B6914",
  hadrosaur: "#2E8B57",
  ankylosaur: "#708090",
  stegosaur: "#8B4513",
  ornithopod: "#CD853F",
  pachycephalosaur: "#9370DB",
  ornithomimosaur: "#D2691E",
  oviraptorosaur: "#DB7093",
  bird: "#4682B4",
  trace: "#A0522D",
  unknown: "#999",
};

const GROUP_LABELS: Record<string, string> = {
  theropod: "獸腳類 Theropoda",
  sauropod: "蜥腳類 Sauropoda",
  ceratopsian: "角龍類 Ceratopsia",
  hadrosaur: "鴨嘴龍類 Hadrosauridae",
  ankylosaur: "甲龍類 Ankylosauria",
  stegosaur: "劍龍類 Stegosauria",
  ornithopod: "鳥腳類 Ornithopoda",
  pachycephalosaur: "厚頭龍類 Pachycephalosauria",
  ornithomimosaur: "似鳥龍類 Ornithomimosauria",
  oviraptorosaur: "偷蛋龍類 Oviraptorosauria",
  bird: "鳥類 Aves",
  trace: "足跡/蛋化石 Trace Fossil",
  unknown: "未分類 Unclassified",
};

function getPeriodColor(period: string): string {
  return PERIOD_COLORS[period] || "#8B5A2B";
}

function formatTaxonomy(fossil: Fossil): string[] {
  const parts: string[] = [];
  if (fossil.taxonomyClass && fossil.taxonomyClass !== "Unknown")
    parts.push(`Class: ${fossil.taxonomyClass}`);
  if (fossil.taxonomyOrder && fossil.taxonomyOrder !== "Unknown" && fossil.taxonomyOrder !== "NO_ORDER_SPECIFIED")
    parts.push(`Order: ${fossil.taxonomyOrder}`);
  if (fossil.taxonomyFamily && fossil.taxonomyFamily !== "Unknown" && fossil.taxonomyFamily !== "NO_FAMILY_SPECIFIED")
    parts.push(`Family: ${fossil.taxonomyFamily}`);
  if (fossil.taxonomyGenus)
    parts.push(`Genus: ${fossil.taxonomyGenus}`);
  if (fossil.taxonomySpecies)
    parts.push(`Species: ${fossil.taxonomySpecies}`);
  return parts;
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
            className="absolute z-30 bg-petra-parchment shadow-report overflow-y-auto
              inset-0 md:inset-auto md:top-0 md:right-0 md:h-full md:w-full md:max-w-md md:border-l-2 md:border-petra-sand"
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

            <div className="relative p-5 pt-4 md:p-8 md:pt-6">
              {/* Report Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-body text-[10px] text-petra-sienna uppercase tracking-[0.2em] border border-petra-sienna/30 px-2 py-0.5 rounded">
                    Excavation Report
                  </span>
                  <span className="font-body text-[10px] text-petra-fossil uppercase tracking-wider">
                    PBDB-{fossil.id}
                  </span>
                  <span className="font-body text-[10px] text-white uppercase tracking-wider bg-petra-sienna/80 px-2 py-0.5 rounded">
                    {GROUP_LABELS[fossil.group] || fossil.group}
                  </span>
                </div>

                <h2 className="font-display text-2xl md:text-3xl text-petra-sepia leading-tight mb-1">
                  <em>{fossil.name}</em>
                </h2>
                <p className="font-body text-sm text-petra-fossil">
                  &ldquo;{fossil.commonName}&rdquo;
                </p>
              </div>

              {/* Dinosaur Image */}
              <ReportImage genus={fossil.taxonomyGenus || fossil.commonName} group={fossil.group} />

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

              {/* Geological Period Badge */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mb-8 flex justify-center"
              >
                <div
                  className="relative border border-petra-sand/60 rounded-lg px-8 py-6 text-center"
                  style={{ backgroundColor: getPeriodColor(fossil.period) + "88" }}
                >
                  <span className="font-body text-[10px] text-petra-sepia/70 uppercase tracking-[0.2em] block mb-2">
                    Geological Period
                  </span>
                  <span className="font-display text-2xl font-bold block mb-1 text-petra-sepia">
                    {fossil.period}
                  </span>
                  <span className="font-body text-sm text-petra-sepia/70">
                    {fossil.age}
                  </span>
                  {/* Frame corners */}
                  <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-petra-sienna/30" />
                  <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-petra-sienna/30" />
                  <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-petra-sienna/30" />
                  <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-petra-sienna/30" />
                </div>
              </motion.div>

              {/* Taxonomy Section */}
              <div className="mb-8">
                <h3 className="font-display text-sm text-petra-sienna uppercase tracking-wider mb-3">
                  Taxonomy
                </h3>
                <div className="bg-petra-bone/40 border border-petra-sand/50 rounded px-4 py-3 space-y-1">
                  {formatTaxonomy(fossil).map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="font-body text-[11px] text-petra-fossil w-16 shrink-0">
                        {line.split(": ")[0]}:
                      </span>
                      <span className="font-display text-[13px] text-petra-sepia font-medium italic">
                        {line.split(": ")[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <DataField label="Formation" value={fossil.formation} />
                <DataField label="Location" value={fossil.location} />
                <DataField label="Age" value={fossil.age} />
                <DataField
                  label="Coordinates"
                  value={`${Math.abs(fossil.coords[1]).toFixed(1)}°${fossil.coords[1] >= 0 ? "N" : "S"}, ${Math.abs(fossil.coords[0]).toFixed(1)}°${fossil.coords[0] >= 0 ? "E" : "W"}`}
                />
              </div>

              {/* PBDB Link */}
              <div className="mb-8">
                <button
                  onClick={() => {
                    window.open(
                      fossil.pbdbUrl,
                      "pbdb_taxon",
                      "width=800,height=600,scrollbars=yes,resizable=yes"
                    );
                  }}
                  className="inline-flex items-center gap-2 bg-petra-bone/60 border border-petra-sand hover:border-petra-sienna rounded px-4 py-2.5 transition-colors group cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-petra-fossil group-hover:text-petra-sienna transition-colors" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                  <span className="font-body text-xs text-petra-fossil group-hover:text-petra-sienna transition-colors uppercase tracking-wider">
                    View on Paleobiology Database
                  </span>
                </button>
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

function ReportImage({ genus, group }: { genus: string; group: string }) {
  const { url, loading } = useDinoImage(genus);
  const [imgLoaded, setImgLoaded] = useState(false);
  const groupColor = GROUP_SILHOUETTE_COLORS[group] || "#8B5A2B";

  if (loading) {
    return (
      <div className="mb-6">
        <div className="petra-report-image-shimmer h-48 rounded-lg bg-petra-bone animate-pulse" />
      </div>
    );
  }

  if (url) {
    return (
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-lg border border-petra-sand bg-petra-bone/30">
          {!imgLoaded && (
            <div className="h-48 bg-petra-bone animate-pulse" />
          )}
          <motion.img
            src={url}
            alt={genus}
            initial={{ opacity: 0 }}
            animate={{ opacity: imgLoaded ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            onLoad={() => setImgLoaded(true)}
            className="petra-report-image w-full max-h-52 object-cover"
          />
        </div>
        <a
          href={`https://en.wikipedia.org/wiki/${encodeURIComponent(genus)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 font-body text-[10px] text-petra-fossil/60 hover:text-petra-sienna transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
            <path d="M4.002 3.5a.5.5 0 01.5-.5h7a.5.5 0 01.5.5v9a.5.5 0 01-.998.064L8 7.694 4.998 12.564A.5.5 0 014.002 12.5v-9z" />
          </svg>
          Image: Wikimedia Commons
        </a>
      </div>
    );
  }

  // Fallback: PhyloPic silhouette
  return (
    <div className="mb-6">
      <div className="petra-report-image-fallback relative overflow-hidden rounded-lg border border-petra-sand h-48 flex items-center justify-center">
        <div
          className="w-24 h-24"
          style={{
            WebkitMaskImage: `url(/silhouettes/${group}.svg)`,
            maskImage: `url(/silhouettes/${group}.svg)`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            backgroundColor: groupColor,
            opacity: 0.5,
          }}
        />
      </div>
      <span className="mt-1.5 block font-body text-[10px] text-petra-fossil/40 italic">
        Illustration unavailable — silhouette shown
      </span>
    </div>
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
