import { spawnSync } from "node:child_process";

const checks = [
  {
    name: "CI - api",
    commands: [
      ["corepack", ["pnpm", "--filter", "api", "check"]],
      ["corepack", ["pnpm", "--filter", "api", "test"]],
      ["corepack", ["pnpm", "--filter", "api", "build"]],
    ],
  },
  {
    name: "CI - web",
    commands: [
      ["corepack", ["pnpm", "--filter", "web", "check"]],
      ["corepack", ["pnpm", "--filter", "web", "build"]],
    ],
  },
  {
    name: "CI - workspace",
    commands: [["corepack", ["pnpm", "run", "doctor"]]],
  },
  {
    name: "CI - ai-core",
    commands: [
      [
        "corepack",
        ["pnpm", "--filter", "@ai-novel-diagnosis/ai-core", "check"],
      ],
      [
        "corepack",
        ["pnpm", "--filter", "@ai-novel-diagnosis/ai-core", "test"],
      ],
      [
        "corepack",
        ["pnpm", "--filter", "@ai-novel-diagnosis/ai-core", "build"],
      ],
    ],
  },
];

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(result.error.message);
    return typeof result.status === "number" ? result.status : 1;
  }

  return typeof result.status === "number" ? result.status : 1;
}

for (const check of checks) {
  console.log(`\n==> ${check.name}`);

  for (const [command, args] of check.commands) {
    console.log(`$ ${[command, ...args].join(" ")}`);
    const status = run(command, args);

    if (status !== 0) {
      console.error(`\n${check.name} failed.`);
      process.exit(status);
    }
  }
}

console.log("\nAll four CI checks passed.");
