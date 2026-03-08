import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; localBypass?: string }>;
}) {
  const params = await searchParams;

  // If local bypass failed, keep login visible to avoid redirect loops.
  if (isLocalAuthBypassEnabled() && !params.localBypass) {
    redirect("/auto-login?next=/today");
  }

  return <LoginForm registered={params.registered === "1"} />;
}
