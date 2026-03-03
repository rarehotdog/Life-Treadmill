#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const ALLOWED = [
  /^apps\/unmyeong-snap\//,
  /^\.github\/workflows\/unmyeong-staging-validation\.yml$/
];

function sh(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function isAllowed(path) {
  return ALLOWED.some((rule) => rule.test(path));
}

function main() {
  const appDir = process.cwd();
  const repoRoot = sh("git", ["rev-parse", "--show-toplevel"], appDir);
  const stagedRaw = sh("git", ["diff", "--cached", "--name-only"], repoRoot);

  if (!stagedRaw) {
    console.error("[FAIL] staged 파일이 없습니다.");
    console.error("- 먼저 git add 로 staging 후 다시 실행하세요.");
    process.exit(1);
  }

  const staged = stagedRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocked = staged.filter((file) => !isAllowed(file));

  if (blocked.length > 0) {
    console.error("[FAIL] 허용 범위를 벗어난 staged 파일이 있습니다.");
    for (const file of blocked) {
      console.error(`- ${file}`);
    }
    console.error("\n허용 범위:");
    console.error("- apps/unmyeong-snap/**");
    console.error("- .github/workflows/unmyeong-staging-validation.yml");
    process.exit(1);
  }

  console.log("[PASS] staged 파일 범위가 정책과 일치합니다.");
  for (const file of staged) {
    console.log(`- ${file}`);
  }
}

main();
