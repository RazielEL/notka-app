import { redirect } from "next/navigation";

import { NotkaApp } from "@/components/app-shell/notka-app";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureInboxFolder, listFolders } from "@/lib/server/folders";
import { listNotes } from "@/lib/server/notes";
import { listTemplates } from "@/lib/server/templates";
import { hasUsers } from "@/lib/server/users";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasUsers())) {
    redirect("/setup");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const inbox = await ensureInboxFolder(user.id);
  const [folders, notes, templates] = await Promise.all([
    listFolders(user.id),
    listNotes(user.id),
    listTemplates(user.id),
  ]);

  return (
    <NotkaApp
      user={user}
      initialFolders={folders}
      initialNotes={notes}
      initialTemplates={templates}
      defaultFolderId={inbox.id}
    />
  );
}
