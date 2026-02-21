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
  const getErrorFailures = (checks) => checks.filter((item) => !item.pass && item.severity !== 'warning');
  const getWarnings = (checks) => checks.filter((item) => !item.pass && item.severity === 'warning');
  const lines = [];
  lines.push('# LTR Screenshot QA Report');
  lines.push('');
  lines.push(`- Generated At: ${report.generatedAt}`);
  lines.push(`- Base URL: ${report.baseUrl}`);
  lines.push(`- Result: ${report.summary.passed ? 'PASS' : 'FAIL'}`);
  lines.push(`- Gate Policy: ${report.summary.gatePolicy}`);
  lines.push(`- Total Checks: ${report.summary.totalChecks}`);
  lines.push(`- Passed Checks: ${report.summary.passedChecks}`);
  lines.push(`- Failed Checks: ${report.summary.failedChecks}`);
  lines.push(`- Warning Checks: ${report.summary.warningChecks}`);
  lines.push('');
  lines.push('## Viewport Summary');
  lines.push('');
  lines.push('| Width | Height | Checks | Passed | Failed | Warnings | Screenshots |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');

  for (const viewport of report.viewports) {
    const errors = getErrorFailures(viewport.checks);
    const warnings = getWarnings(viewport.checks);
    lines.push(
      `| ${viewport.width} | ${viewport.height} | ${viewport.checks.length} | ${viewport.checks.filter((item) => item.pass).length} | ${errors.length} | ${warnings.length} | ${viewport.screenshots.length} |`,
    );
  }

  lines.push('');
  lines.push('## Detailed Checks');
  lines.push('');

  for (const viewport of report.viewports) {
    lines.push(`### ${viewport.width} x ${viewport.height}`);
    lines.push('');
    for (const check of viewport.checks) {
      const marker = check.pass ? '[x]' : check.severity === 'warning' ? '[!]' : '[ ]';
      lines.push(`- ${marker} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
    }
    lines.push('');
    lines.push('Screenshots:');
    for (const shot of viewport.screenshots) {
      lines.push(`- ${shot}`);
    }
    lines.push('');
  }

  lines.push('## Typography Drift');
  lines.push('');
  for (const viewport of report.viewports) {
    const driftChecks = viewport.checks.filter((check) => check.name.includes('typography drift'));
    if (driftChecks.length === 0) continue;
    lines.push(`### ${viewport.width} x ${viewport.height}`);
    for (const check of driftChecks) {
      const marker = check.pass ? '[x]' : '[ ]';
      lines.push(`- ${marker} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
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
  lines.push('- [ ] Progress Decision Log card visible and detail sheet opens');
  lines.push('- [ ] Decision Log 14/30d toggle + search + filters render and no-match empty-state works');
  lines.push('- [ ] Progress Sync Reliability card and retry CTA visible');
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

  const pushCheck = (name, pass, detail = '', severity = 'error') => {
    checks.push({ name, pass, detail, severity });
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

    const homeTypographyDrift = await page.evaluate(() => {
      const banned = new Set(['text-xs', 'text-sm', 'text-lg', 'text-2xl', 'text-3xl']);
      const root = document.querySelector('[data-testid="screen-home"]');
      if (!root) {
        return { pass: false, detail: 'screen-home container missing' };
      }

      const violations = [];
      const exceptions = [];
      const nodes = root.querySelectorAll('[class]');
      for (const node of nodes) {
        const classValue =
          typeof node.className === 'string'
            ? node.className
            : node.getAttribute('class') || '';
        const classes = classValue.split(/\s+/).filter(Boolean);
        const text = (node.textContent || '').trim();
        const hasLabelChars = /[A-Za-z0-9가-힣]/.test(text.replace(/\s+/g, ''));

        for (const className of classes) {
          if (!banned.has(className)) continue;

          // Decorative emoji text can keep raw size classes.
          if ((className === 'text-2xl' || className === 'text-3xl') && text && !hasLabelChars) {
            exceptions.push(`${className}:${text.slice(0, 6)}`);
            continue;
          }
          violations.push(className);
        }
      }

      const uniqueViolations = Array.from(new Set(violations));
      return {
        pass: uniqueViolations.length === 0,
        detail: uniqueViolations.length === 0
          ? exceptions.length > 0
            ? `decorative exceptions=${exceptions.length}`
            : ''
          : `raw classes=${uniqueViolations.join(', ')}`,
      };
    });
    pushCheck('screen-home typography drift', homeTypographyDrift.pass, homeTypographyDrift.detail);

    const fontCheck = await page.evaluate(() => {
      const target = document.querySelector('[data-testid="app-shell"]') || document.body;
      const family = getComputedStyle(target).fontFamily || '';
      const pass = family.toLowerCase().includes('pretendard');
      return { pass, family };
    });
    pushCheck(
      'pretendard font family detected',
      fontCheck.pass,
      fontCheck.pass ? fontCheck.family : `resolved=${fontCheck.family}`,
      'warning',
    );

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
        await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) {
            throw new Error(`open trigger not found: ${selector}`);
          }
          element.click();
        }, flow.open);
        await page.waitForSelector(flow.modal, { timeout: SCREENSHOT_TIMEOUT_MS });
        await page.waitForTimeout(WAIT_MODAL_MS);
        await captureScreenshot(page, outputRoot, width, sequence, flow.label, screenshots);
        sequence += 1;
        pushCheck(`${flow.name} open`, true);

        const modalHierarchy = await page.evaluate((selector) => {
          const modal = document.querySelector(selector);
          if (!modal) return { pass: false, detail: 'modal root missing' };
          const hasTitle = !!modal.querySelector('.modal-title');
          const hasSubtle = !!modal.querySelector('.modal-subtle');
          const hasCta = !!modal.querySelector('.cta-primary, .cta-secondary');
          const missing = [];
          if (!hasTitle) missing.push('modal-title');
          if (!hasSubtle) missing.push('modal-subtle');
          if (!hasCta) missing.push('cta-*');
          return {
            pass: missing.length === 0,
            detail: missing.length === 0 ? '' : `missing ${missing.join(', ')}`,
          };
        }, flow.modal);
        pushCheck(`${flow.name} hierarchy tokens`, modalHierarchy.pass, modalHierarchy.detail);
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

      const typographyDrift = await page.evaluate((selector) => {
        const banned = new Set(['text-xs', 'text-sm', 'text-lg', 'text-2xl', 'text-3xl']);
        const root = document.querySelector(selector);
        if (!root) return { pass: false, detail: `missing ${selector}` };

        const violations = [];
        const exceptions = [];
        const nodes = root.querySelectorAll('[class]');
        for (const node of nodes) {
          const classValue =
            typeof node.className === 'string'
              ? node.className
              : node.getAttribute('class') || '';
          const classes = classValue.split(/\s+/).filter(Boolean);
          const text = (node.textContent || '').trim();
          const hasLabelChars = /[A-Za-z0-9가-힣]/.test(text.replace(/\s+/g, ''));
          for (const className of classes) {
            if (!banned.has(className)) continue;
            if ((className === 'text-2xl' || className === 'text-3xl') && text && !hasLabelChars) {
              exceptions.push(`${className}:${text.slice(0, 6)}`);
              continue;
            }
            violations.push(className);
          }
        }

        const uniqueViolations = Array.from(new Set(violations));
        return {
          pass: uniqueViolations.length === 0,
          detail: uniqueViolations.length === 0
            ? exceptions.length > 0
              ? `decorative exceptions=${exceptions.length}`
              : ''
            : `raw classes=${uniqueViolations.join(', ')}`,
        };
      }, flow.screen);
      pushCheck(`${flow.label} typography drift`, typographyDrift.pass, typographyDrift.detail);

      if (flow.label === 'screen-progress') {
        const decisionLogSectionCount = await page
          .locator('[data-testid="decision-log-section"]')
          .count();
        pushCheck(
          'decision log section visible',
          decisionLogSectionCount > 0,
          decisionLogSectionCount > 0 ? '' : 'section missing',
        );

        if (decisionLogSectionCount > 0) {
          const decisionLogSearchCount = await page
            .locator('[data-testid="decision-log-search"]')
            .count();
          pushCheck(
            'decision log search input visible',
            decisionLogSearchCount > 0,
            decisionLogSearchCount > 0 ? '' : 'search input missing',
          );

          const window14Count = await page
            .locator('[data-testid="decision-log-window-14"]')
            .count();
          pushCheck(
            'decision log window 14 toggle visible',
            window14Count > 0,
            window14Count > 0 ? '' : '14-day toggle missing',
          );

          const window30Count = await page
            .locator('[data-testid="decision-log-window-30"]')
            .count();
          pushCheck(
            'decision log window 30 toggle visible',
            window30Count > 0,
            window30Count > 0 ? '' : '30-day toggle missing',
          );

          const validationFilterCount = await page
            .locator('[data-testid="decision-log-validation-needs-review"]')
            .count();
          pushCheck(
            'decision log validation filter visible',
            validationFilterCount > 0,
            validationFilterCount > 0 ? '' : 'validation filter missing',
          );

          const statusFilterCount = await page
            .locator('[data-testid="decision-log-status-delayed"]')
            .count();
          pushCheck(
            'decision log status filter visible',
            statusFilterCount > 0,
            statusFilterCount > 0 ? '' : 'status filter missing',
          );

          if (decisionLogSearchCount > 0) {
            const decisionSearchInput = page
              .locator('[data-testid="decision-log-search"]')
              .first();
            await decisionSearchInput.fill('@@no-match-query@@');
            await page.waitForTimeout(WAIT_SHORT_MS);
            const emptyAfterSearch = await page
              .locator('[data-testid="decision-log-empty"]')
              .count();
            pushCheck(
              'decision log search no-match state',
              emptyAfterSearch > 0,
              emptyAfterSearch > 0 ? '' : 'empty-state not shown after no-match query',
            );

            const emptyResetCtaCount = await page
              .locator('[data-testid="decision-log-empty-reset"]')
              .count();
            pushCheck(
              'decision log no-match reset CTA',
              emptyResetCtaCount > 0,
              emptyResetCtaCount > 0 ? '' : 'empty reset CTA missing',
            );

            const resetFilterButton = page
              .locator('[data-testid="decision-log-reset-filters"]')
              .first();
            if ((await resetFilterButton.count()) > 0) {
              await resetFilterButton.click();
            } else {
              await decisionSearchInput.fill('');
            }
            await page.waitForTimeout(WAIT_SHORT_MS);
          }

          const decisionLogItem = page.locator('[data-testid="decision-log-item"]').first();
          const decisionLogItemCount = await decisionLogItem.count();
          const decisionLogEmptyCount = await page
            .locator('[data-testid="decision-log-empty"]')
            .count();

          if (decisionLogItemCount > 0) {
            try {
              await decisionLogItem.click();
              await page.waitForSelector('[data-testid="decision-log-detail-sheet"]', {
                timeout: SCREENSHOT_TIMEOUT_MS,
              });
              await page.waitForTimeout(WAIT_MODAL_MS);
              await captureScreenshot(
                page,
                outputRoot,
                width,
                sequence,
                'decision-log-detail',
                screenshots,
              );
              sequence += 1;
              pushCheck('decision log detail sheet render', true);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              pushCheck('decision log detail sheet render', false, message);
            }

            try {
              const closeButton = page
                .locator('[data-testid="decision-log-detail-close"]')
                .first();
              if ((await closeButton.count()) > 0) {
                await closeButton.click();
              } else {
                await page.keyboard.press('Escape');
              }
              await page.waitForSelector('[data-testid="decision-log-detail-sheet"]', {
                state: 'detached',
                timeout: SCREENSHOT_TIMEOUT_MS,
              });
              pushCheck('decision log detail sheet close', true);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              pushCheck('decision log detail sheet close', false, message);
            }
          } else {
            pushCheck(
              'decision log empty-state visible',
              decisionLogEmptyCount > 0,
              decisionLogEmptyCount > 0 ? '' : 'no item and no empty-state',
            );
          }
        }

        const syncCardCount = await page
          .locator('[data-testid="sync-reliability-card"]')
          .count();
        pushCheck(
          'sync reliability card visible',
          syncCardCount > 0,
          syncCardCount > 0 ? '' : 'card missing',
        );

        const syncRetryButtonCount = await page
          .locator('[data-testid="sync-retry-button"]')
          .count();
        pushCheck(
          'sync retry button visible',
          syncRetryButtonCount > 0,
          syncRetryButtonCount > 0 ? '' : 'retry button missing',
        );
      }
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
      summary: {
        passed: true,
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0,
        gatePolicy: 'error_only',
      },
      viewports: VIEWPORT_WIDTHS.map((width) => ({ width, height: VIEWPORT_HEIGHT[width] })),
      checklist: [
        'home',
        'techtree',
        'progress',
        'profile',
        'energy',
        'voice',
        'future',
        'share',
        'failure',
        'decision-log',
        'sync-reliability',
      ],
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
      '[qa] playwright package is missing. run "npm run qa:screenshots:install" and retry.\n',
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

    let browser;
    try {
      browser = await playwright.chromium.launch({
        headless: !args.headed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Executable') || message.includes('install')) {
        throw new Error(
          `${message}\n[qa] Chromium executable is missing. run "npm run qa:screenshots:install" and retry.`,
        );
      }
      throw error;
    }

    const viewports = [];
    for (const width of VIEWPORT_WIDTHS) {
      process.stdout.write(`[qa] capturing ${width}px...\n`);
      const result = await runViewportChecks(browser, baseUrl, outputRoot, width);
      viewports.push(result);
    }

    await browser.close();

    const allChecks = viewports.flatMap((viewport) => viewport.checks);
    const warningChecks = allChecks.filter((check) => !check.pass && check.severity === 'warning').length;
    const failedChecks = allChecks.filter((check) => !check.pass && check.severity !== 'warning').length;
    const passedChecks = allChecks.filter((check) => check.pass).length;

    const report = {
      generatedAt,
      durationMs: Date.now() - startedAt,
      baseUrl,
      outputRoot: normalizePath(outputRoot),
      summary: {
        passed: failedChecks === 0,
        gatePolicy: 'error_only',
        totalChecks: allChecks.length,
        passedChecks,
        failedChecks,
        warningChecks,
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
