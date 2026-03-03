#!/usr/bin/env node

import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function parseArgs(argv) {
  const options = {
    deleteEnv: false,
    moveEnvDir: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--delete-env") {
      options.deleteEnv = true;
    }
    if (arg === "--move-env") {
      options.moveEnvDir = argv[i + 1] ?? "";
      i += 1;
    }
  }

  return options;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const appDir = process.cwd();
  const envPath = join(appDir, ".env.local");

  if (!existsSync(envPath)) {
    console.log("[INFO] .env.local 파일이 없습니다.");
    return;
  }

  if (args.moveEnvDir) {
    const targetDir = resolve(args.moveEnvDir);
    mkdirSync(targetDir, { recursive: true });
    const targetPath = join(targetDir, `unmyeong-snap.env.local.${Date.now()}`);
    renameSync(envPath, targetPath);
    console.log(`[PASS] .env.local 이동 완료: ${targetPath}`);
    return;
  }

  if (args.deleteEnv) {
    rmSync(envPath, { force: true });
    console.log("[PASS] .env.local 삭제 완료");
    return;
  }

  console.log("[WARN] 아무 동작도 수행하지 않았습니다.");
  console.log("- 삭제: npm run office:security:close -- --delete-env");
  console.log("- 이동: npm run office:security:close -- --move-env /secure/path");
  console.log(`- 현재 파일: ${envPath}`);
}

main();
