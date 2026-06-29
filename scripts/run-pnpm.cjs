#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

let result = run("corepack", ["pnpm", ...args]);

if (result.error && result.error.code === "ENOENT") {
  result = run("pnpm", args);
}

if (result.error) {
  console.error(result.error.message);
  process.exit(typeof result.status === "number" ? result.status : 1);
}

process.exit(typeof result.status === "number" ? result.status : 1);
