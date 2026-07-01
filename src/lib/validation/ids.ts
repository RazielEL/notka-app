const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/;

export function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID_PATTERN.test(value);
}

export function assertSafeId(value: unknown, label = "id"): string {
  if (!isSafeId(value)) {
    throw new Error(`Invalid ${label}`);
  }

  return value;
}

export function normalizeName(value: unknown, fallback = "Untitled") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized.slice(0, 120) : fallback;
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return null;
  }

  return email;
}

export function normalizeContent(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n/g, "\n").slice(0, 1_000_000);
}

export function normalizeScope(value: unknown) {
  return value === "group" ? "group" : "personal";
}
