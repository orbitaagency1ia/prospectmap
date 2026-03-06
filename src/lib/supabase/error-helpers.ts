type ErrorLike = {
  code?: string | null;
  message?: string | null;
  hint?: string | null;
};

export function isMissingTableError(error: ErrorLike | null | undefined, tableName?: string) {
  if (!error) {
    return false;
  }

  if (error.code === "42P01") {
    return true;
  }

  if (error.code !== "PGRST205") {
    return false;
  }

  const message = `${error.message ?? ""} ${error.hint ?? ""}`;
  if (!tableName) {
    return message.includes("schema cache");
  }

  return message.includes(`public.${tableName}`);
}
