import { exec } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(exec);

export default async function valkey(): Promise<void> {
  try {
    // Already running?
    await run("docker inspect -f '{{.State.Running}}' valkey");

    console.log("Valkey already running.");
    return;
  } catch {}

  try {
    console.log("Starting Valkey...");

    await run(`
docker run -d \
  --name valkey \
  -p 6379:6379 \
  -v valkey-data:/data \
  --restart unless-stopped \
  valkey/valkey:latest
`);

    console.log("Valkey started.");
  } catch (e: unknown | Error | any) {
    // Container exists but is stopped
    if (e.stderr?.includes("Conflict")) {
      await run("docker start valkey");
      console.log("Existing Valkey container started.");
      return;
    }

    throw e;
  }
}
