import "server-only";

import { asc, count, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb, getSqlite } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password";
import type { AppUserDto } from "@/lib/types";
import { normalizeEmail, normalizeName } from "@/lib/validation/ids";

export async function hasUsers() {
  const [row] = await getDb().select({ count: count() }).from(users);
  return (row?.count ?? 0) > 0;
}

export async function createAdminUser(input: {
  email: unknown;
  displayName: unknown;
  password: unknown;
}) {
  const email = normalizeEmail(input.email);
  const displayName = normalizeName(input.displayName, "Admin");

  if (!email) {
    throw new Error("Enter a valid email address.");
  }

  if (!validatePassword(input.password)) {
    throw new Error("Password must be at least 8 characters.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const passwordHash = await hashPassword(input.password);
  const user = {
    id,
    email,
    displayName,
    passwordHash,
    role: "admin",
    createdAt: now,
    updatedAt: now,
  };

  try {
    const sqlite = getSqlite();
    const insertFirstAdmin = sqlite.transaction(() => {
      const row = sqlite.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };

      if ((row?.count ?? 0) > 0) {
        throw new Error("Setup is disabled after the first user exists.");
      }

      sqlite
        .prepare(
          `INSERT INTO users
            (id, email, display_name, password_hash, role, created_at, updated_at)
           VALUES
            (@id, @email, @displayName, @passwordHash, @role, @createdAt, @updatedAt)`,
        )
        .run(user);
    });

    insertFirstAdmin();
  } catch (error) {
    if (isSqliteConstraintError(error)) {
      throw new Error("An account with this email already exists.");
    }

    throw error;
  }

  return { id, email, displayName, role: "admin" };
}

export async function createUser(input: {
  email: unknown;
  displayName: unknown;
  password: unknown;
}) {
  const email = normalizeEmail(input.email);
  const displayName = normalizeName(input.displayName, "User");

  if (!email) {
    throw new Error("Enter a valid email address.");
  }

  if (!validatePassword(input.password)) {
    throw new Error("Password must be at least 8 characters.");
  }

  const existing = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    throw new Error("An account with this email already exists.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  try {
    await getDb().insert(users).values({
      id,
      email,
      displayName,
      passwordHash: await hashPassword(input.password),
      role: "user",
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isSqliteConstraintError(error)) {
      throw new Error("An account with this email already exists.");
    }

    throw error;
  }

  return { id, email, displayName, role: "user" };
}

export async function authenticateUser(emailInput: unknown, passwordInput: unknown) {
  const email = normalizeEmail(emailInput);

  if (!email || typeof passwordInput !== "string") {
    return null;
  }

  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = rows[0];

  if (!user || !(await verifyPassword(passwordInput, user.passwordHash))) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export async function getHiddenNotesSettings(userId: string) {
  const rows = await getDb()
    .select({ hiddenPinHash: users.hiddenPinHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    hasPin: Boolean(rows[0]?.hiddenPinHash),
  };
}

export async function setHiddenNotesPin(userId: string, pinInput: unknown, passwordInput: unknown) {
  if (typeof passwordInput !== "string" || !passwordInput) {
    throw new Error("Confirm your account password.");
  }

  const rows = await getDb()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(passwordInput, user.passwordHash))) {
    throw new Error("Invalid password.");
  }

  if (pinInput === null || pinInput === "") {
    await getDb()
      .update(users)
      .set({ hiddenPinHash: null, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId));
    return getHiddenNotesSettings(userId);
  }

  if (!validateHiddenPin(pinInput)) {
    throw new Error("PIN must be 4 to 12 digits.");
  }

  await getDb()
    .update(users)
    .set({
      hiddenPinHash: await hashPassword(pinInput),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  return getHiddenNotesSettings(userId);
}

export async function verifyHiddenNotesAccess(userId: string, input: {
  pin?: unknown;
  password?: unknown;
}) {
  const rows = await getDb()
    .select({
      hiddenPinHash: users.hiddenPinHash,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0];

  if (!user) {
    return false;
  }

  if (
    typeof input.pin === "string" &&
    user.hiddenPinHash &&
    await verifyPassword(input.pin, user.hiddenPinHash)
  ) {
    return true;
  }

  if (
    typeof input.password === "string" &&
    await verifyPassword(input.password, user.passwordHash)
  ) {
    return true;
  }

  return false;
}

export async function listUsers(): Promise<AppUserDto[]> {
  const rows = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .orderBy(asc(users.displayName), asc(users.email));

  return rows;
}

function isSqliteConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    ("code" in error || "message" in error) &&
    /constraint|unique/i.test(error.message)
  );
}

function validateHiddenPin(value: unknown): value is string {
  return typeof value === "string" && /^\d{4,12}$/.test(value);
}
