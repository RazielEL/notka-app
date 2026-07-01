import "server-only";

import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import type { AuthUser } from "@/lib/types";

const SESSION_COOKIE = "notka_session";
const SESSION_TTL_DAYS = 30;
const LOCAL_DEVELOPMENT_SECRET = "notka-local-development-secret";
const COMPOSE_PLACEHOLDER_SECRET = "change-this-long-random-string";

export async function createSession(userId: string) {
  const sessionId = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await deleteExpiredSessions(now);
  await getDb().insert(sessions).values({
    id: sessionId,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  cookies().set(SESSION_COOKIE, signSessionId(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnabled(),
    path: "/",
    expires: expiresAt,
  });
}

async function deleteExpiredSessions(now = new Date()) {
  await getDb().delete(sessions).where(lt(sessions.expiresAt, now.toISOString()));
}

export async function destroySession() {
  const sessionId = getCookieSessionId();

  if (sessionId) {
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
  }

  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnabled(),
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const sessionId = getCookieSessionId();

  if (!sessionId) {
    return null;
  }

  const now = new Date().toISOString();
  const rows = await getDb()
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];

  if (!row) {
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return {
    id: row.userId,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
  };
}

function getCookieSessionId() {
  const value = cookies().get(SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  const [sessionId, signature] = value.split(".");

  if (!sessionId || !signature || !verifySignature(sessionId, signature)) {
    return null;
  }

  return sessionId;
}

function signSessionId(sessionId: string) {
  return `${sessionId}.${createSignature(sessionId)}`;
}

function createSignature(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
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

function getSessionSecret() {
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
