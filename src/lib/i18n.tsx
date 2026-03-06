"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import en from "@/../locales/en.json";
import zhTW from "@/../locales/zh-TW.json";
import dinoNamesZh from "@/../locales/dino-names-zh.json";
import familyNamesZh from "@/../locales/family-names-zh.json";

export type Locale = "en" | "zh-TW";

type Messages = Record<string, string>;

const MESSAGES: Record<Locale, Messages> = {
  en,
  "zh-TW": zhTW,
};

const DINO_NAMES_ZH: Record<string, string> = dinoNamesZh as Record<string, string>;
const FAMILY_NAMES_ZH: Record<string, string> = familyNamesZh as Record<string, string>;

const STORAGE_KEY = "petra-locale";

function detectLocale(): Locale {
  // Check localStorage first
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh-TW") return stored;

    // Detect from browser language
    const lang = navigator.language || "";
    if (lang.startsWith("zh")) return "zh-TW";
  }
  return "en";
}

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  tDino: (genus: string) => string;
  tFamily: (family: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  tDino: (genus) => genus,
  tFamily: (family) => family,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return MESSAGES[locale]?.[key] || MESSAGES.en[key] || key;
    },
    [locale]
  );

  const tDino = useCallback(
    (genus: string): string => {
      if (locale === "zh-TW") {
        return DINO_NAMES_ZH[genus] || genus;
      }
      return genus;
    },
    [locale]
  );

  const tFamily = useCallback(
    (family: string): string => {
      if (locale === "zh-TW") {
        return FAMILY_NAMES_ZH[family] || family;
      }
      return family;
    },
    [locale]
  );

  // Avoid hydration mismatch: render with "en" on server, detect on client
  if (!mounted) {
    return (
      <I18nContext.Provider
        value={{
          locale: "en",
          setLocale,
          t: (key) => MESSAGES.en[key] || key,
          tDino: (genus) => genus,
          tFamily: (family) => family,
        }}
      >
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tDino, tFamily }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
