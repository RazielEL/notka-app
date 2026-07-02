import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { SetupForm } from "@/components/auth/setup-form";
import { hasUsers } from "@/lib/server/users";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await hasUsers()) {
    redirect("/login");
  }

  return (
    <AuthCard titleKey="auth.setupTitle" subtitleKey="auth.setupSubtitle">
      <SetupForm />
    </AuthCard>
  );
}
