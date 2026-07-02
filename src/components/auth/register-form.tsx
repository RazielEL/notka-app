"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { translateApiError } from "@/lib/i18n";

export function RegisterForm() {
  const router = useRouter();
  const { language, t } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        displayName: formData.get("displayName"),
        password: formData.get("password"),
      }),
    });

    const body = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(translateApiError(language, body.error, "auth.registerError"));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {t("auth.name")}
        </span>
        <input
          className="notka-input"
          type="text"
          name="displayName"
          autoComplete="name"
          required
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {t("auth.email")}
        </span>
        <input className="notka-input" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {t("auth.password")}
        </span>
        <input
          className="notka-input"
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      <Button className="w-full" type="submit" variant="primary" disabled={loading}>
        <UserPlus className="h-4 w-4" />
        {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
      </Button>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        {t("auth.haveAccount")}{" "}
        <Link className="font-semibold text-teal-700 hover:text-teal-600 dark:text-teal-300" href="/login">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}
