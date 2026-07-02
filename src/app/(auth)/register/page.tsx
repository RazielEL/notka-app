import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/session";
import { hasUsers } from "@/lib/server/users";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!(await hasUsers())) {
    redirect("/setup");
  }

  if (await getCurrentUser()) {
    redirect("/");
  }

  return (
    <AuthCard titleKey="auth.registerTitle" subtitleKey="auth.registerSubtitle">
      <RegisterForm />
    </AuthCard>
  );
}
