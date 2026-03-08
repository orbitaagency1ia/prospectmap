import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";

export default function RegisterPage() {
  if (isLocalAuthBypassEnabled()) {
    redirect("/auto-login?next=/today");
  }

  return <RegisterForm />;
}
