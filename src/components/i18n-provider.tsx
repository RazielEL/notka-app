"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  isLanguage,
  languages,
  normalizeLanguage,
  translate,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (
    key: TranslationKey,
    values?: Record<string, string | number | null | undefined>,
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem("notka-language");

    if (isLanguage(stored)) {
      setLanguageState(stored);
      return;
    }

    setLanguageState(normalizeLanguage(navigator.language));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("notka-language", language);
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key, values) => translate(language, key, values),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}

export { languages };
