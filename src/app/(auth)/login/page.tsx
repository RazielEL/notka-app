import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { hasUsers } from "@/lib/server/users";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await hasUsers())) {
    redirect("/setup");
  }

  if (await getCurrentUser()) {
    redirect("/");
  }

  return (
    <AuthCard titleKey="auth.loginTitle" subtitleKey="auth.loginSubtitle">
      <LoginForm />
    </AuthCard>
  );
}
