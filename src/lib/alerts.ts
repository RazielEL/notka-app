import { localeForLanguage, type Language } from "@/lib/i18n";

export type AlertTone = "none" | "neon" | "yellow" | "red";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getAlertTone(alertAt: string | null | undefined, now = new Date()): AlertTone {
  if (!alertAt) {
    return "none";
  }

  const deadline = new Date(alertAt).getTime();

  if (Number.isNaN(deadline)) {
    return "none";
  }

  const daysUntilDeadline = (deadline - now.getTime()) / DAY_MS;

  if (daysUntilDeadline <= 1) {
    return "red";
  }

  if (daysUntilDeadline <= 2) {
    return "yellow";
  }

  if (daysUntilDeadline <= 3) {
    return "neon";
  }

  return "none";
}

export function isActiveAlert(alertAt: string | null | undefined, now = new Date()) {
  return getAlertTone(alertAt, now) !== "none";
}

export function formatAlertDeadline(alertAt: string | null | undefined, language: Language = "en") {
  if (!alertAt) {
    return "";
  }

  const deadline = new Date(alertAt);

  if (Number.isNaN(deadline.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(localeForLanguage(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(deadline);
}
