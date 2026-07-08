import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const HIDDEN_ACCESS_COOKIE = "notka_hidden_access";
const HIDDEN_ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
const LOCAL_DEVELOPMENT_SECRET = "notka-local-development-secret";
const COMPOSE_PLACEHOLDER_SECRET = "change-this-long-random-string";

export function createHiddenAccess(userId: string) {
  const expiresAt = Date.now() + HIDDEN_ACCESS_TTL_MS;
  const payload = `${userId}.${expiresAt}`;

  cookies().set(HIDDEN_ACCESS_COOKIE, `${payload}.${createSignature(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnabled(),
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearHiddenAccess() {
  cookies().set(HIDDEN_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnabled(),
    path: "/",
    maxAge: 0,
  });
}

export function hasHiddenAccess(userId: string) {
  const value = cookies().get(HIDDEN_ACCESS_COOKIE)?.value;

  if (!value) {
    return false;
  }

  const parts = value.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [cookieUserId, expiresAtValue, signature] = parts;
  const expiresAt = Number(expiresAtValue);
  const payload = `${cookieUserId}.${expiresAtValue}`;

  return (
    cookieUserId === userId &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now() &&
    verifySignature(payload, signature)
  );
}

function createSignature(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function verifySignature(value: string, signature: string) {
  const expected = createSignature(value);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function getSecret() {
  const secret = process.env.SESSION_SECRET ?? LOCAL_DEVELOPMENT_SECRET;

  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.SESSION_SECRET ||
      secret === LOCAL_DEVELOPMENT_SECRET ||
      secret === COMPOSE_PLACEHOLDER_SECRET ||
      secret.length < 32)
  ) {
    throw new Error("SESSION_SECRET must be set to a long random value in production.");
  }

  return secret;
}

function isSecureCookieEnabled() {
  return process.env.SESSION_COOKIE_SECURE === "true";
}
