#!/usr/bin/env node
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const execAsync = promisify(exec);

// ── helpers ──────────────────────────────────────────────────────────────────

const run = async (cmd) => {
  const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() });
  return (stdout + stderr).trim();
};

const rl = readline.createInterface({ input, output });

const ask = (q) => rl.question(`\x1b[36m${q}\x1b[0m`);

const log = {
  info:    (m) => console.log(`\x1b[32m✔\x1b[0m  ${m}`),
  warn:    (m) => console.log(`\x1b[33m⚠\x1b[0m  ${m}`),
  error:   (m) => console.error(`\x1b[31m✖\x1b[0m  ${m}`),
  section: (m) => console.log(`\n\x1b[1m\x1b[34m── ${m} ──\x1b[0m`),
};

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    // 1. Git status
    log.section("Git Status");
    const status = await run("git status --short");
    if (!status) {
      log.warn("Nothing to commit, working tree clean.");
      rl.close();
      return;
    }
    console.log(status);

    // 2. List branches
    log.section("Branches");
    const branchesRaw = await run("git branch -a");
    const branches = branchesRaw
      .split("\n")
      .map((b) => b.replace(/^\*?\s+/, "").replace(/^remotes\/origin\//, "").trim())
      .filter((b, i, arr) => b && !b.includes("HEAD ->") && arr.indexOf(b) === i);

    const currentRaw = await run("git branch --show-current");
    const current = currentRaw.trim();

    branches.forEach((b, i) => {
      const marker = b === current ? "\x1b[32m* " : "  ";
      console.log(`  \x1b[33m[${i}]\x1b[0m ${marker}${b}\x1b[0m`);
    });
    console.log(`  \x1b[33m[n]\x1b[0m   create new branch`);

    // 3. Branch selection
    const branchInput = (await ask("\nSelect branch number or [n] for new: ")).trim();

    let targetBranch;
    if (branchInput.toLowerCase() === "n") {
      targetBranch = (await ask("New branch name: ")).trim();
      if (!targetBranch) throw new Error("Branch name cannot be empty.");
      await run(`git checkout -b ${targetBranch}`);
      log.info(`Created and switched to branch "${targetBranch}"`);
    } else {
      const idx = parseInt(branchInput, 10);
      if (isNaN(idx) || idx < 0 || idx >= branches.length)
        throw new Error("Invalid selection.");
      targetBranch = branches[idx];
      if (targetBranch !== current) {
        await run(`git checkout ${targetBranch}`);
        log.info(`Switched to branch "${targetBranch}"`);
      } else {
        log.info(`Already on "${targetBranch}"`);
      }
    }

    // 4. Commit message
    log.section("Commit");
    const message = (await ask("Commit message: ")).trim();
    if (!message) throw new Error("Commit message cannot be empty.");

    // 5. Stage → commit → push
    await run("git add -A");
    log.info("Staged all changes.");

    await run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    log.info(`Committed: "${message}"`);

    log.section("Pushing");
    try {
      await run(`git push origin ${targetBranch}`);
      log.info(`Pushed to origin/${targetBranch}`);
    } catch {
      // First push on a new branch needs --set-upstream
      await run(`git push --set-upstream origin ${targetBranch}`);
      log.info(`Pushed (set upstream) to origin/${targetBranch}`);
    }

    log.section("Done");
    console.log(`\x1b[32mAll done!\x1b[0m  Branch: \x1b[1m${targetBranch}\x1b[0m | Message: "${message}"\n`);
  } catch (err) {
    log.error(err?.message ?? String(err));
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
