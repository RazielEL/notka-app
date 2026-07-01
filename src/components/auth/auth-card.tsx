import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
      <section className="glass-panel w-full max-w-md rounded-2xl p-5 sm:rounded-[2rem] sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
              NOTKA
            </p>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
