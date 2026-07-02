"use client";

import type { ReactNode } from "react";

import { languages, useI18n } from "@/components/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

export function AuthCard({
  titleKey,
  subtitleKey,
  children,
}: {
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  children: ReactNode;
}) {
  const { language, setLanguage, t } = useI18n();

  return (
    <main className="flex min-h-dvh items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
      <section className="glass-panel w-full max-w-md rounded-2xl p-5 sm:rounded-[2rem] sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
              {t("auth.brand")}
            </p>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">
              {t(titleKey)}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t(subtitleKey)}
            </p>
          </div>
          <div className="segmented-control shrink-0">
            {languages.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={
                  language === entry.id
                    ? "segmented-button segmented-button-active px-2.5"
                    : "segmented-button px-2.5"
                }
                onClick={() => setLanguage(entry.id)}
              >
                {entry.shortLabel}
              </button>
            ))}
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
