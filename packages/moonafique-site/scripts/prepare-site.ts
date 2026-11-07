import { spawnSync } from "node:child_process";

// Separate processes keep each deployment check's database lifecycle isolated.
for (const script of [
  "scripts/grimmunity/prepare-deployment.ts",
  "scripts/check-newsletter.ts",
  "scripts/check-whatnot.ts",
  "scripts/check-whatnot-inventory.ts",
  "scripts/prepare-whatnot-analytics.ts",
]) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], { stdio: "inherit", env: process.env });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
