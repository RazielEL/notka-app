import "server-only";

import { createSession } from "@/lib/auth/session";
import { createNote } from "@/lib/server/notes";
import { createAdminUser, hasUsers } from "@/lib/server/users";

export async function runFirstSetup(input: {
  email: unknown;
  displayName: unknown;
  password: unknown;
}) {
  if (await hasUsers()) {
    throw new Error("Setup is disabled after the first user exists.");
  }

  const user = await createAdminUser(input);

  await createNote(user.id, {
    title: "Welcome to Notka",
    content:
      "# Welcome to Notka\n\nThis is your private Markdown notebook.\n\n- [x] Create the first admin user\n- [ ] Write a note\n- [ ] Keep a checklist in Markdown\n\nNotes and checklists live together here. A checklist is just Markdown.\n",
  });

  await createSession(user.id);
  return user;
}
