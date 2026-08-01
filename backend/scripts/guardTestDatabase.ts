import { config } from "dotenv";

config();
config({ path: new URL("../.env", import.meta.url) });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL || process.env.TEST_DATABASE_URL;
}

function isSafeTestDatabase(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("file:")) return true;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const database = parsed.pathname.toLowerCase();

    return (
      ["localhost", "127.0.0.1", "::1"].includes(host) ||
      host.endsWith(".localhost") ||
      database.includes("test")
    );
  } catch {
    return false;
  }
}

if (
  process.env.ALLOW_REMOTE_TESTS !== "true" &&
  !isSafeTestDatabase(process.env.DATABASE_URL)
) {
  console.error(
    "Refusing to run backend tests against a non-test database. Set TEST_DATABASE_URL to a local/test DB, or set ALLOW_REMOTE_TESTS=true intentionally.",
  );
  process.exit(1);
}
