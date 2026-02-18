#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const VIEWPORT_WIDTHS = [375, 390, 430];
const VIEWPORT_HEIGHT = {
  375: 812,
  390: 844,
  430: 932,
};

const WAIT_SHORT_MS = 250;
const WAIT_MODAL_MS = 500;
const SERVER_BOOT_TIMEOUT_MS = 60_000;
const SCREENSHOT_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const args = {
    baseUrl: '',
    port: 3000,
    outputDir: '',
    noServer: false,
    headed: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--base-url') {
      args.baseUrl = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--port') {
      const parsed = Number.parseInt(argv[index + 1] || '', 10);
      if (Number.isFinite(parsed)) args.port = parsed;
      index += 1;
      continue;
    }
    if (token === '--output-dir') {
      args.outputDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--no-server') {
      args.noServer = true;
      continue;
    }
    if (token === '--headed') {
      args.headed = true;
      continue;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

function getTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        method: 'GET',
      });
      if (response.ok || response.status === 404) return true;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }
  return false;
}

function startDevServer(port) {
  return spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
    stdio: 'pipe',
    env: {
      ...process.env,
    },
  });
}

async function resolvePlaywright() {
  try {
    return await import('playwright');
  } catch {
    return null;
  }
}

function normalizePath(targetPath) {
  return targetPath.split(path.sep).join('/');
}

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function renderMarkdownReport(report) {
  const lines = [];
  lines.push('# LTR Screenshot QA Report');
  lines.push('');
  lines.push(`- Generated At: ${report.generatedAt}`);
  lines.push(`- Base URL: ${report.baseUrl}`);
  lines.push(`- Result: ${report.summary.passed ? 'PASS' : 'FAIL'}`);
  lines.push(`- Total Checks: ${report.summary.totalChecks}`);
  lines.push(`- Passed Checks: ${report.summary.passedChecks}`);
  lines.push(`- Failed Checks: ${report.summary.failedChecks}`);
  lines.push('');
  lines.push('## Viewport Summary');
  lines.push('');
  lines.push('| Width | Height | Checks | Passed | Failed | Screenshots |');
  lines.push('| --- | --- | --- | --- | --- | --- |');

  for (const viewport of report.viewports) {
    lines.push(
      `| ${viewport.width} | ${viewport.height} | ${viewport.checks.length} | ${viewport.checks.filter((item) => item.pass).length} | ${viewport.checks.filter((item) => !item.pass).length} | ${viewport.screenshots.length} |`,
    );
  }

  lines.push('');
  lines.push('## Detailed Checks');
  lines.push('');

  for (const viewport of report.viewports) {
    lines.push(`### ${viewport.width} x ${viewport.height}`);
    lines.push('');
    for (const check of viewport.checks) {
      lines.push(`- ${check.pass ? '[x]' : '[ ]'} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
    }
    lines.push('');
    lines.push('Screenshots:');
    for (const shot of viewport.screenshots) {
      lines.push(`- ${shot}`);
    }
    lines.push('');
  }

  if (report.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const error of report.errors) {
      lines.push(`- ${error}`);
    }
    lines.push('');
  }

  lines.push('## Checklist');
  lines.push('');
  lines.push('- [ ] Home/TechTree/Progress/Profile visible in each viewport');
  lines.push('- [ ] Energy/Voice/Future/Share/Failure modal open and close');
  lines.push('- [ ] Top system bar and bottom navigation visible');
  lines.push('- [ ] No horizontal overflow');
  lines.push('- [ ] Primary touch targets are >= 44x44');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function captureScreenshot(page, outputRoot, width, sequence, label, screenshots) {
  const fileName = `${String(sequence).padStart(2, '0')}-${label}.png`;
  const relative = normalizePath(path.join(String(width), fileName));
  const absolute = path.join(outputRoot, relative);
  await ensureDir(path.dirname(absolute));
  await page.screenshot({
    path: absolute,
    fullPage: true,
  });
  screenshots.push(relative);
}

async function runViewportChecks(browser, baseUrl, outputRoot, width) {
  const height = VIEWPORT_HEIGHT[width] ?? 844;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const checks = [];
  const screenshots = [];
  let sequence = 1;

  const pushCheck = (name, pass, detail = '') => {
    checks.push({ name, pass, detail });
  };

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: SCREENSHOT_TIMEOUT_MS * 2 });
    await page.waitForSelector('[data-testid="screen-home"]', { timeout: SCREENSHOT_TIMEOUT_MS });
    await page.waitForTimeout(WAIT_SHORT_MS);
    await captureScreenshot(page, outputRoot, width, sequence, 'screen-home', screenshots);
    sequence += 1;
    pushCheck('home screen render', true);

    const systemBarCount = await page.locator('[data-testid="top-system-bar"]').count();
    pushCheck('top system bar visible', systemBarCount > 0);

    const navCount = await page.locator('[data-testid="bottom-navigation"]').count();
    pushCheck('bottom navigation visible', navCount > 0);

    const overflowFree = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    pushCheck('no horizontal overflow', overflowFree, overflowFree ? '' : 'detected document overflow');

    const homeHeadingTokenCheck = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1')).every((node) =>
        node.className.includes('heading-1'),
      ),
    );
    pushCheck('home heading token usage', homeHeadingTokenCheck);

    const touchSelectors = [
      '[data-testid="open-energy-checkin"]',
      '[data-testid="open-voice-checkin"]',
      '[data-testid="open-share-card"]',
      '[data-testid="open-future-self"]',
    ];

    for (const selector of touchSelectors) {
      const locator = page.locator(selector).first();
      if ((await locator.count()) === 0) {
        pushCheck(`touch target ${selector}`, false, 'missing selector');
        continue;
      }
      const box = await locator.boundingBox();
      const pass = !!box && box.width >= 44 && box.height >= 44;
      pushCheck(`touch target ${selector}`, pass, pass ? '' : `size=${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'n/a'}`);
    }

    const modalFlows = [
      {
        name: 'energy modal',
        open: '[data-testid="open-energy-checkin"]',
        modal: '[data-testid="energy-modal"]',
        close: '[data-testid="energy-modal-close"]',
        label: 'modal-energy',
      },
      {
        name: 'voice modal',
        open: '[data-testid="open-voice-checkin"]',
        modal: '[data-testid="voice-modal"]',
        close: '[data-testid="voice-modal-close"]',
        label: 'modal-voice',
      },
      {
        name: 'future modal',
        open: '[data-testid="open-future-self"]',
        modal: '[data-testid="future-modal"]',
        close: '[data-testid="future-modal-close"]',
        label: 'modal-future',
      },
      {
        name: 'share modal',
        open: '[data-testid="open-share-card"]',
        modal: '[data-testid="share-modal"]',
        close: '[data-testid="share-modal-close"]',
        label: 'modal-share',
      },
      {
        name: 'failure modal',
        open: '[data-testid^="quest-fail-"]',
        modal: '[data-testid="failure-modal"]',
        close: '[data-testid="failure-modal-close"]',
        label: 'modal-failure',
      },
    ];

    for (const flow of modalFlows) {
      const openButton = page.locator(flow.open).first();
      if ((await openButton.count()) === 0) {
        pushCheck(`${flow.name} open`, false, 'open button not found');
        continue;
      }

      try {
        await openButton.click();
        await page.waitForSelector(flow.modal, { timeout: SCREENSHOT_TIMEOUT_MS });
        await page.waitForTimeout(WAIT_MODAL_MS);
        await captureScreenshot(page, outputRoot, width, sequence, flow.label, screenshots);
        sequence += 1;
        pushCheck(`${flow.name} open`, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pushCheck(`${flow.name} open`, false, message);
        continue;
      }

      try {
        const closeButton = page.locator(flow.close).first();
        if ((await closeButton.count()) > 0) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForSelector(flow.modal, {
          state: 'detached',
          timeout: SCREENSHOT_TIMEOUT_MS,
        });
        await page.waitForTimeout(WAIT_SHORT_MS);
        pushCheck(`${flow.name} close`, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pushCheck(`${flow.name} close`, false, message);
      }
    }

    const navigationFlows = [
      {
        nav: '[data-testid="nav-techTree"]',
        screen: '[data-testid="screen-techtree"]',
        label: 'screen-techtree',
      },
      {
        nav: '[data-testid="nav-progress"]',
        screen: '[data-testid="screen-progress"]',
        label: 'screen-progress',
      },
      {
        nav: '[data-testid="nav-profile"]',
        screen: '[data-testid="screen-profile"]',
        label: 'screen-profile',
      },
      {
        nav: '[data-testid="nav-home"]',
        screen: '[data-testid="screen-home"]',
        label: 'screen-home-return',
      },
    ];

    for (const flow of navigationFlows) {
      const nav = page.locator(flow.nav).first();
      if ((await nav.count()) === 0) {
        pushCheck(`${flow.label} navigation`, false, 'nav button missing');
        continue;
      }

      try {
        await nav.click();
        await page.waitForSelector(flow.screen, { timeout: SCREENSHOT_TIMEOUT_MS });
        await page.waitForTimeout(WAIT_SHORT_MS);
        await captureScreenshot(page, outputRoot, width, sequence, flow.label, screenshots);
        sequence += 1;
        pushCheck(`${flow.label} navigation`, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pushCheck(`${flow.label} navigation`, false, message);
      }

      const headingTokenCheck = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1')).every((node) =>
          node.className.includes('heading-1'),
        ),
      );
      pushCheck(`${flow.label} heading token usage`, headingTokenCheck);
    }
  } finally {
    await context.close();
  }

  return {
    width,
    height,
    checks,
    screenshots,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();
  const generatedAt = new Date().toISOString();
  const runDirName = getTimestamp();
  const outputRoot =
    args.outputDir && args.outputDir.trim()
      ? path.resolve(args.outputDir.trim())
      : path.resolve(process.cwd(), 'artifacts', 'qa-screenshots', runDirName);

  await ensureDir(outputRoot);

  if (args.dryRun) {
    const dryRunPayload = {
      generatedAt,
      mode: 'dry-run',
      outputRoot,
      viewports: VIEWPORT_WIDTHS.map((width) => ({ width, height: VIEWPORT_HEIGHT[width] })),
      checklist: ['home', 'techtree', 'progress', 'profile', 'energy', 'voice', 'future', 'share', 'failure'],
    };
    await writeJson(path.join(outputRoot, 'report.json'), dryRunPayload);
    await fs.writeFile(
      path.join(outputRoot, 'report.md'),
      '# LTR Screenshot QA Report (Dry Run)\n\nPlaywright가 설치되지 않은 환경에서 체크리스트 템플릿만 생성했습니다.\n',
      'utf8',
    );
    process.stdout.write(`[qa] dry-run report generated: ${outputRoot}\n`);
    return;
  }

  const playwright = await resolvePlaywright();
  if (!playwright) {
    process.stderr.write(
      '[qa] playwright package is missing. install it first with "npm install -D playwright" and run again.\n',
    );
    process.exitCode = 1;
    return;
  }

  let devServer = null;
  const baseUrl = args.baseUrl || `http://127.0.0.1:${args.port}`;
  const errors = [];

  try {
    const isServerReachable = await waitForServer(baseUrl, 2_000);
    if (!isServerReachable && !args.noServer) {
      devServer = startDevServer(args.port);
      devServer.stdout.on('data', (chunk) => {
        const line = String(chunk);
        if (line.includes('Local:') || line.includes('ready')) {
          process.stdout.write(`[dev] ${line}`);
        }
      });
      devServer.stderr.on('data', (chunk) => {
        process.stderr.write(`[dev:stderr] ${String(chunk)}`);
      });
    }

    const booted = await waitForServer(baseUrl, SERVER_BOOT_TIMEOUT_MS);
    if (!booted) {
      throw new Error(`server boot timeout (${baseUrl})`);
    }

    const browser = await playwright.chromium.launch({
      headless: !args.headed,
    });

    const viewports = [];
    for (const width of VIEWPORT_WIDTHS) {
      process.stdout.write(`[qa] capturing ${width}px...\n`);
      const result = await runViewportChecks(browser, baseUrl, outputRoot, width);
      viewports.push(result);
    }

    await browser.close();

    const allChecks = viewports.flatMap((viewport) => viewport.checks);
    const passedChecks = allChecks.filter((check) => check.pass).length;
    const failedChecks = allChecks.length - passedChecks;

    const report = {
      generatedAt,
      durationMs: Date.now() - startedAt,
      baseUrl,
      outputRoot: normalizePath(outputRoot),
      summary: {
        passed: failedChecks === 0,
        totalChecks: allChecks.length,
        passedChecks,
        failedChecks,
      },
      viewports,
      errors,
    };

    const reportJsonPath = path.join(outputRoot, 'report.json');
    const reportMarkdownPath = path.join(outputRoot, 'report.md');
    await writeJson(reportJsonPath, report);
    await fs.writeFile(reportMarkdownPath, renderMarkdownReport(report), 'utf8');

    process.stdout.write(`[qa] report.json: ${reportJsonPath}\n`);
    process.stdout.write(`[qa] report.md: ${reportMarkdownPath}\n`);
    process.stdout.write(`[qa] result: ${report.summary.passed ? 'PASS' : 'FAIL'}\n`);
    if (!report.summary.passed) {
      process.exitCode = 2;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    process.stderr.write(`[qa] failed: ${message}\n`);
    process.exitCode = 1;
  } finally {
    if (devServer && !devServer.killed) {
      devServer.kill('SIGTERM');
    }

    const errorReportPath = path.join(outputRoot, 'report.error.json');
    if (errors.length > 0 && !existsSync(errorReportPath)) {
      await writeJson(errorReportPath, {
        generatedAt,
        baseUrl,
        errors,
      });
    }
  }
}

main();
