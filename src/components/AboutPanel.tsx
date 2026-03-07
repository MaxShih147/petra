"use client";

import { useI18n } from "@/lib/i18n";

const TECH_STACK = [
  { name: "Next.js 15", url: "https://nextjs.org" },
  { name: "React 19", url: "https://react.dev" },
  { name: "Mapbox GL", url: "https://www.mapbox.com" },
  { name: "Framer Motion", url: "https://motion.dev" },
  { name: "Tailwind CSS", url: "https://tailwindcss.com" },
];

export default function AboutPanel() {
  const { t } = useI18n();

  return (
    <div className="px-4 py-4 space-y-5 overflow-y-auto flex-1 min-h-0">
      {/* Tagline */}
      <p className="font-body text-[12px] text-petra-fossil leading-relaxed">
        {t("about.tagline")}
      </p>

      {/* Author */}
      <Section title={t("about.authorTitle")}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-petra-sienna/15 border border-petra-sand flex items-center justify-center">
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-petra-sienna/70" fill="currentColor">
              <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
            </svg>
          </div>
          <div>
            <span className="font-display text-sm text-petra-sepia font-medium block">
              {t("about.authorName")}
            </span>
            <a
              href="https://github.com/MaxShih147"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-[11px] text-petra-fossil hover:text-petra-sienna transition-colors"
            >
              @MaxShih147
            </a>
          </div>
        </div>
      </Section>

      {/* Data Source */}
      <Section title={t("about.dataTitle")}>
        <p className="font-body text-[11px] text-petra-fossil leading-relaxed">
          {t("about.dataDesc")}
        </p>
        <a
          href="https://paleobiodb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1.5 font-body text-[11px] text-petra-sienna hover:text-petra-sepia transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7 9" />
          </svg>
          paleobiodb.org
        </a>
      </Section>

      {/* Tech Stack */}
      <Section title={t("about.builtWith")}>
        <div className="flex flex-wrap gap-1.5">
          {TECH_STACK.map((tech) => (
            <a
              key={tech.name}
              href={tech.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded border border-petra-sand/60 bg-petra-bone/40 font-body text-[10px] text-petra-fossil hover:border-petra-sienna/50 hover:text-petra-sienna transition-colors"
            >
              {tech.name}
            </a>
          ))}
        </div>
      </Section>

      {/* Source Code */}
      <Section title={t("about.sourceCode")}>
        <a
          href="https://github.com/MaxShih147/petra"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-body text-[11px] text-petra-fossil hover:text-petra-sienna transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          MaxShih147/petra
        </a>
      </Section>

      {/* Version */}
      <div className="pt-2 border-t border-petra-sand/40">
        <span className="font-body text-[10px] text-petra-fossil/40">
          {t("about.version")}
        </span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-[11px] text-petra-sienna uppercase tracking-[0.15em] mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
