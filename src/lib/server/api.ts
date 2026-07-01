import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";

const MAX_JSON_BODY_BYTES = 1_500_000;

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return user;
}

export async function readJson(request: Request) {
  const contentLength = request.headers.get("content-length");
  const parsedContentLength = contentLength ? Number.parseInt(contentLength, 10) : 0;

  if (Number.isFinite(parsedContentLength) && parsedContentLength > MAX_JSON_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  const text = await request.text();

  if (Buffer.byteLength(text, "utf8") > MAX_JSON_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

export function apiError(error: unknown, status = 400) {
  const rawMessage = error instanceof Error ? error.message : "Something went wrong.";
  const configurationError = /SESSION_SECRET/i.test(rawMessage);
  const internalDatabaseError = /SQLITE_|database|constraint failed|foreign key/i.test(rawMessage);
  const resolvedStatus =
    configurationError || internalDatabaseError
      ? 500
      : /not found/i.test(rawMessage)
        ? 404
        : status;
  const message =
    process.env.NODE_ENV === "production" && (configurationError || resolvedStatus >= 500)
      ? configurationError
        ? "Server is not configured correctly."
        : "Something went wrong."
      : rawMessage;

  return NextResponse.json({ error: message }, { status: resolvedStatus });
}
