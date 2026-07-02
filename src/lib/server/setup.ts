import "server-only";

import { assertSessionConfiguration, createSession } from "@/lib/auth/session";
import { getWelcomeNote, normalizeLanguage } from "@/lib/i18n";
import { createNote } from "@/lib/server/notes";
import { createAdminUser, hasUsers } from "@/lib/server/users";

export async function runFirstSetup(input: {
  email: unknown;
  displayName: unknown;
  password: unknown;
  language?: unknown;
}) {
  assertSessionConfiguration();

  if (await hasUsers()) {
    throw new Error("Setup is disabled after the first user exists.");
  }

  const user = await createAdminUser(input);
  const language = normalizeLanguage(input.language);
  const welcomeNote = getWelcomeNote(language);

  await createNote(user.id, {
    title: welcomeNote.title,
    content: welcomeNote.content,
    language,
  });

  await createSession(user.id);
  return user;
}
