import crypto from "node:crypto";
/** Includes the project suffix used by shared poolers; excludes credentials. */
export function databaseScopeFingerprint(url: string) {
  const value = new URL(url),
    project = value.username.includes(".")
      ? value.username.split(".").at(-1)!
      : "";
  return crypto
    .createHash("sha256")
    .update(
      [
        value.hostname.toLowerCase(),
        value.port || "5432",
        decodeURIComponent(value.pathname),
        project,
      ].join("|"),
    )
    .digest("hex");
}
