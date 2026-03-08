import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  if (isLocalAuthBypassEnabled()) {
    redirect("/auto-login?next=/today");
  }

  const params = await searchParams;
  return <LoginForm registered={params.registered === "1"} />;
}
