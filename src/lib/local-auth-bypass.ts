export function isLocalAuthBypassEnabled() {
  return process.env.LOCAL_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production";
}

export function getLocalBypassCredentials() {
  return {
    email: process.env.LOCAL_BYPASS_EMAIL?.trim() ?? "",
    password: process.env.LOCAL_BYPASS_PASSWORD ?? "",
  };
}

export function getSafeNextPath(rawNext: string | null | undefined, fallback = "/today") {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return fallback;
  }

  return rawNext;
}
