"use client";

import { useI18n, type Locale } from "@/lib/i18n";

export default function LangSwitch() {
  const { locale, setLocale } = useI18n();

  const toggle = () => {
    const next: Locale = locale === "en" ? "zh-TW" : "en";
    setLocale(next);
  };

  return (
    <button
      onClick={toggle}
      className="px-2 py-1 rounded border border-petra-sand hover:border-petra-sienna bg-petra-bone/60 hover:bg-petra-bone transition-colors cursor-pointer font-body text-[10px] text-petra-sepia font-medium tracking-wider"
      title={locale === "en" ? "切換為中文" : "Switch to English"}
    >
      {locale === "en" ? "EN" : "中文"}
    </button>
  );
}
