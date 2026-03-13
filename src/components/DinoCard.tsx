"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Fossil } from "@/types/fossil";
import { motion, AnimatePresence } from "framer-motion";
import { useDinoImage } from "@/lib/imageResolver";
import { getSilhouette } from "@/lib/dinoSilhouettes";
import { useI18n } from "@/lib/i18n";

interface DinoCardProps {
  fossil: Fossil | null;
  onClose: () => void;
}

/* ─── Visual Config ─── */

const GROUP_COLORS: Record<string, { color1: string; color2: string }> = {
  theropod:         { color1: "#ffa07a", color2: "#ff4500" },
  sauropod:         { color1: "#90ee90", color2: "#228b22" },
  ceratopsian:      { color1: "#ffe4b5", color2: "#daa520" },
  hadrosaur:        { color1: "#98fb98", color2: "#2e8b57" },
  ankylosaur:       { color1: "#b0c4de", color2: "#708090" },
  stegosaur:        { color1: "#deb887", color2: "#8b4513" },
  ornithopod:       { color1: "#ffdead", color2: "#cd853f" },
  pachycephalosaur: { color1: "#dda0dd", color2: "#9370db" },
  ornithomimosaur:  { color1: "#ffa07a", color2: "#d2691e" },
  oviraptorosaur:   { color1: "#ffb6c1", color2: "#db7093" },
  bird:             { color1: "#87ceeb", color2: "#4682b4" },
  trace:            { color1: "#d2b48c", color2: "#8b4513" },
  unknown:          { color1: "#d3d3d3", color2: "#999999" },
};

const MAJOR_PERIOD_COLORS: Record<string, string> = {
  Triassic: "#812B92",
  Jurassic: "#34B2C9",
  Cretaceous: "#7FC64E",
  Paleogene: "#FD9A52",
  Neogene: "#FFE619",
  Quaternary: "#F9F97F",
};

function getRarity(genus: string): number {
  let hash = 0;
  for (let i = 0; i < genus.length; i++) {
    hash = ((hash << 5) - hash + genus.charCodeAt(i)) | 0;
  }
  const val = Math.abs(hash) % 100;
  if (val < 5) return 5;
  if (val < 15) return 4;
  if (val < 35) return 3;
  if (val < 65) return 2;
  return 1;
}

const RARITY_LABELS: Record<number, { en: string; zh: string; color: string }> = {
  1: { en: "Common", zh: "\u666E\u901A", color: "#9E9E9E" },
  2: { en: "Uncommon", zh: "\u7A00\u6709", color: "#4CAF50" },
  3: { en: "Rare", zh: "\u7A00\u6709", color: "#2196F3" },
  4: { en: "Epic", zh: "\u53F2\u8A69", color: "#9C27B0" },
  5: { en: "Legendary", zh: "\u50B3\u8AAA", color: "#FF9800" },
};

/* ─── Component ─── */

export default function DinoCard({ fossil, onClose }: DinoCardProps) {
  const { t, tDino, locale } = useI18n();

  return (
    <AnimatePresence>
      {fossil && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 pointer-events-none"
          >
            <HoloCard fossil={fossil} onClose={onClose} locale={locale} t={t} tDino={tDino} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function HoloCard({
  fossil,
  onClose,
  locale,
  t,
  tDino,
}: {
  fossil: Fossil;
  onClose: () => void;
  locale: string;
  t: (key: string) => string;
  tDino: (genus: string) => string;
}) {
  const { url, loading } = useDinoImage(fossil.taxonomyGenus || fossil.commonName, fossil.group);
  const [imgLoaded, setImgLoaded] = useState(false);
  const groupStyle = GROUP_COLORS[fossil.group] || GROUP_COLORS.unknown;
  const periodColor = MAJOR_PERIOD_COLORS[fossil.majorPeriod] || "#8B5A2B";
  const rarity = useMemo(() => getRarity(fossil.name), [fossil.name]);
  const rarityInfo = RARITY_LABELS[rarity];
  const silhouetteUrl = getSilhouette(fossil.group);

  const cardRef = useRef<HTMLDivElement>(null);
  const animTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isHovering, setIsHovering] = useState(false);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const l = e.clientX - rect.left;
    const t = e.clientY - rect.top;
    const h = rect.height;
    const w = rect.width;
    const px = Math.abs(Math.floor((100 / w) * l) - 100);
    const py = Math.abs(Math.floor((100 / h) * t) - 100);
    const pa = (50 - px) + (50 - py);
    const lp = 50 + (px - 50) / 1.5;
    const tp = 50 + (py - 50) / 1.5;
    const pxSpark = 50 + (px - 50) / 7;
    const pySpark = 50 + (py - 50) / 7;
    const pOpc = 20 + Math.abs(pa) * 1.5;
    const ty = ((tp - 50) / 2) * -1;
    const tx = ((lp - 50) / 1.5) * 0.5;

    setCardStyle({
      transform: `rotateX(${ty}deg) rotateY(${tx}deg)`,
      "--grad-pos": `${lp}% ${tp}%`,
      "--spark-pos": `${pxSpark}% ${pySpark}%`,
      "--spark-opc": `${pOpc / 100}`,
    } as React.CSSProperties);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    if (animTimeout.current) clearTimeout(animTimeout.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setCardStyle({});
    animTimeout.current = setTimeout(() => {
      // Reset
    }, 2500);
  }, []);

  return (
    <div
      className="pointer-events-auto"
      style={{ perspective: "750px" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={cardRef}
        className={`petra-dino-card ${isHovering ? "hovering" : ""}`}
        style={{
          "--color1": groupStyle.color1,
          "--color2": groupStyle.color2,
          ...cardStyle,
        } as React.CSSProperties}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY, currentTarget: e.currentTarget } as unknown as React.MouseEvent<HTMLDivElement>);
        }}
        onTouchStart={() => setIsHovering(true)}
        onTouchEnd={handleMouseLeave}
      >
        {/* Card content — sits above the ::before and ::after pseudo-elements */}
        <div className="petra-dino-card-content">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-[10] w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 transition-colors pointer-events-auto"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Top: Group + Rarity */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <img
                  src={silhouetteUrl}
                  alt=""
                  className="w-4 h-4"
                  style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }}
                />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                {t(`group.${fossil.group}`)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="text-[9px] font-bold uppercase tracking-wider mr-0.5"
                style={{ color: rarityInfo.color }}
              >
                {locale === "zh-TW" ? rarityInfo.zh : rarityInfo.en}
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 16 16" className="w-2.5 h-2.5" fill={i < rarity ? rarityInfo.color : "rgba(255,255,255,0.15)"}>
                    <path d="M8 1.5l1.85 4.1L14.5 6l-3.25 3 .9 4.5L8 11.25 3.85 13.5l.9-4.5L1.5 6l4.65-.4z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative mx-3 rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: "4/3" }}>
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at center, ${groupStyle.color1}40 0%, rgba(0,0,0,0.6) 100%)`,
              }}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              </div>
            )}
            {url ? (
              <motion.img
                src={url}
                alt={fossil.name}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: imgLoaded ? 1 : 0, scale: imgLoaded ? 1 : 1.1 }}
                transition={{ duration: 0.5 }}
                onLoad={() => setImgLoaded(true)}
                className="relative z-10 w-full h-full object-cover"
              />
            ) : !loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-16 h-16"
                  style={{
                    WebkitMaskImage: `url(${silhouetteUrl})`,
                    maskImage: `url(${silhouetteUrl})`,
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    backgroundColor: groupStyle.color1,
                    opacity: 0.5,
                  }}
                />
              </div>
            ) : null}
            {/* Period pill */}
            <div className="absolute bottom-2 left-2 z-10">
              <span
                className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: periodColor + "DD",
                  color: fossil.majorPeriod === "Neogene" || fossil.majorPeriod === "Quaternary" ? "#333" : "#fff",
                }}
              >
                {t(`period.${fossil.majorPeriod}`)}
              </span>
            </div>
          </div>

          {/* Name */}
          <div className="px-4 pt-3 pb-1">
            <h2 className="text-xl font-black text-white leading-tight">
              <em>{fossil.name}</em>
            </h2>
            <p className="text-sm text-white/50 mt-0.5">
              &ldquo;{tDino(fossil.commonName)}&rdquo;
            </p>
          </div>

          {/* Stats */}
          <div className="px-4 pt-2 pb-4 grid grid-cols-3 gap-2">
            <StatBox label={t("report.age")} value={fossil.age} />
            <StatBox
              label={t("report.location")}
              value={fossil.location.length > 18 ? fossil.location.slice(0, 16) + "\u2026" : fossil.location}
            />
            <StatBox
              label={t("report.formation")}
              value={fossil.formation.length > 18 ? fossil.formation.slice(0, 16) + "\u2026" : fossil.formation}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 flex items-center justify-between bg-white/5">
            <span className="text-[9px] text-white/25 font-mono tracking-wider">
              PBDB-{fossil.id}
            </span>
            <span className="text-[9px] text-white/25 font-mono tracking-wider">
              PETRA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/5 px-2 py-1.5">
      <span className="block text-[8px] uppercase tracking-wider text-white/30 mb-0.5">{label}</span>
      <span className="block text-[10px] font-semibold text-white/80 leading-tight truncate">{value}</span>
    </div>
  );
}
