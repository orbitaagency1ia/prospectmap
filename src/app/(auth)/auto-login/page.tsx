import { redirect } from "next/navigation";

import {
  getSafeNextPath,
  isLocalAuthBypassEnabled,
} from "@/lib/local-auth-bypass";

export default async function AutoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isLocalAuthBypassEnabled()) {
    redirect("/login");
  }

  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next, "/today");

  redirect(`/api/auto-login?next=${encodeURIComponent(nextPath)}`);
}
