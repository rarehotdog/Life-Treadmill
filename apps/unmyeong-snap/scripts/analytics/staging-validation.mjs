#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

const attribution = {
  campaign_id: "staging-campaign-001",
  click_source: "qa-script",
  partition: "quiz-pp",
  ua_creative_topic: "astrocartography",
  utm_source: "facebook_web",
  source: "sub",
  mode: "astrocartography"
};

const profileInput = {
  name: "테스트유저",
  birthDate: "1998-07-11",
  birthTime: "09:30",
  isBirthTimeUnknown: false,
  calendarType: "solar",
  gender: "female",
  concernTopic: "love"
};

const errors = [];
const cookieJar = new Map();

function logStep(message) {
  console.log(`\n[STEP] ${message}`);
}

function ok(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message) {
  console.error(`[FAIL] ${message}`);
  errors.push(message);
}

function getCookieHeader() {
  if (cookieJar.size === 0) {
    return "";
  }

  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function storeSetCookie(headers) {
  const raw = headers.get("set-cookie");
  if (!raw) {
    return;
  }

  const segments = raw.split(/,\s*(?=[^;]+=[^;]+)/g);
  for (const segment of segments) {
    const [pair] = segment.split(";");
    const index = pair.indexOf("=");
    if (index < 1) {
      continue;
    }
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    cookieJar.set(name, value);
  }
}

async function api(path, init = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(init.headers ?? {});
  const cookieHeader = getCookieHeader();
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

  storeSetCookie(response.headers);

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return { response, json, url };
}

function requireOk(result, label) {
  if (!result.response.ok) {
    const body = result.json ? JSON.stringify(result.json) : "<empty>";
    fail(`${label} failed (${result.response.status}) ${body}`);
    if (label === "GET /api/analytics/health" && result.json?.details?.migrationFile) {
      console.error(
        `[HINT] Apply migration first: ${result.json.details.migrationFile}`
      );
      if (Array.isArray(result.json.details.missingTables)) {
        console.error(
          `[HINT] Missing tables: ${result.json.details.missingTables.join(", ")}`
        );
      }
    }
    return false;
  }
  ok(label);
  return true;
}

function requireTruthy(value, label) {
  if (!value) {
    fail(`${label} is missing`);
    return false;
  }
  ok(label);
  return true;
}

async function run() {
  console.log(`[INFO] BASE_URL=${BASE_URL}`);

  logStep("analytics health check");
  const health = await api("/api/analytics/health");
  if (!requireOk(health, "GET /api/analytics/health")) {
    summarizeAndExit();
    return;
  }

  if (health.json?.ok === true) {
    ok("analytics health ok=true");
  } else {
    fail("analytics health reports missing destination config");
  }

  const queue = health.json?.deliveryQueue;
  if (
    queue &&
    typeof queue.ready === "number" &&
    typeof queue.pending === "number" &&
    typeof queue.dead === "number"
  ) {
    ok(`health queue ready=${queue.ready} pending=${queue.pending} dead=${queue.dead}`);
  } else {
    fail("analytics health queue summary is invalid");
  }

  logStep("session start");
  const sessionStart = await api("/api/session/start", {
    method: "POST",
    body: JSON.stringify({ attribution })
  });
  if (!requireOk(sessionStart, "POST /api/session/start")) {
    summarizeAndExit();
    return;
  }

  const sessionId = sessionStart.json?.session?.sessionId;
  const consentSnapshot = sessionStart.json?.consent;

  requireTruthy(sessionId, "sessionId");
  if (consentSnapshot?.marketingTracking === false) {
    ok("default consent marketing=false");
  } else {
    fail("default consent marketing must be false");
  }

  logStep("consent get/update");
  const consentGet = await api("/api/consent");
  requireOk(consentGet, "GET /api/consent");

  const consentUpdate = await api("/api/consent", {
    method: "POST",
    body: JSON.stringify({ marketingTracking: true })
  });
  if (requireOk(consentUpdate, "POST /api/consent marketing=true")) {
    const enabled = consentUpdate.json?.consent?.marketingTracking === true;
    if (enabled) {
      ok("marketing consent updated=true");
    } else {
      fail("marketing consent update did not persist");
    }
  }

  logStep("profile -> preview");
  const profile = await api("/api/profile", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      attribution,
      ...profileInput
    })
  });
  requireOk(profile, "POST /api/profile");

  const preview = await api("/api/report/preview", {
    method: "POST",
    body: JSON.stringify({ sessionId })
  });
  if (!requireOk(preview, "POST /api/report/preview")) {
    summarizeAndExit();
    return;
  }

  const reportId = preview.json?.preview?.reportId;
  if (!requireTruthy(reportId, "reportId")) {
    summarizeAndExit();
    return;
  }

  const previewGet = await api(`/api/report/preview/${reportId}`);
  requireOk(previewGet, "GET /api/report/preview/:reportId");

  logStep("telemetry v2 sample");
  const telemetry = await api("/api/telemetry", {
    method: "POST",
    body: JSON.stringify({
      eventName: "preview_viewed",
      eventType: "marketing",
      eventTime: new Date().toISOString(),
      sessionId,
      pagePath: `/preview/${reportId}`,
      sourceChannel: "web",
      consentSnapshot: consentUpdate.json?.consent,
      payload: {
        ...attribution,
        report_id: reportId
      }
    })
  });
  if (requireOk(telemetry, "POST /api/telemetry v2")) {
    const delivery = telemetry.json?.event?.delivery;
    if (delivery?.amplitude) {
      ok(`telemetry delivery amplitude=${delivery.amplitude} meta=${delivery.meta}`);
    } else {
      fail("telemetry delivery status missing");
    }
  }

  logStep("retry worker");
  if (!CRON_SECRET) {
    fail("CRON_SECRET is required for /api/analytics/retry validation");
  } else {
    const retry = await api("/api/analytics/retry?destination=all&limit=100", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`
      },
      body: JSON.stringify({
        dryRun: false
      })
    });

    if (requireOk(retry, "POST /api/analytics/retry")) {
      const stats = retry.json ?? {};
      const hasSummary =
        typeof stats.processed === "number" &&
        typeof stats.sent === "number" &&
        typeof stats.failed === "number" &&
        typeof stats.remaining === "number";

      if (hasSummary) {
        ok(
          `retry summary processed=${stats.processed} sent=${stats.sent} failed=${stats.failed} remaining=${stats.remaining}`
        );
      } else {
        fail("retry summary payload is invalid");
      }
    }
  }

  logStep("payment fail recovery and report");
  const paymentCreateFailed = await api("/api/payment/create", {
    method: "POST",
    headers: {
      "Idempotency-Key": `staging-${reportId}-single-990-attempt1`
    },
    body: JSON.stringify({
      sessionId,
      reportId,
      productCode: "single_990"
    })
  });
  if (!requireOk(paymentCreateFailed, "POST /api/payment/create attempt1")) {
    summarizeAndExit();
    return;
  }

  const failedOrderId = paymentCreateFailed.json?.order?.orderId;
  if (!requireTruthy(failedOrderId, "failedOrderId")) {
    summarizeAndExit();
    return;
  }

  const paymentFailConfirm = await api("/api/payment/confirm", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      orderId: failedOrderId,
      status: "failed"
    })
  });
  if (requireOk(paymentFailConfirm, "POST /api/payment/confirm failed")) {
    if (paymentFailConfirm.json?.order?.status === "failed") {
      ok("payment failed recovery path captured");
    } else {
      fail("payment failed confirmation status mismatch");
    }
  }

  const paymentCreateSuccess = await api("/api/payment/create", {
    method: "POST",
    headers: {
      "Idempotency-Key": `staging-${reportId}-single-990-attempt2`
    },
    body: JSON.stringify({
      sessionId,
      reportId,
      productCode: "single_990"
    })
  });
  if (!requireOk(paymentCreateSuccess, "POST /api/payment/create attempt2")) {
    summarizeAndExit();
    return;
  }

  const paidOrderId = paymentCreateSuccess.json?.order?.orderId;
  if (!requireTruthy(paidOrderId, "paidOrderId")) {
    summarizeAndExit();
    return;
  }

  const paymentConfirm = await api("/api/payment/confirm", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      orderId: paidOrderId,
      status: "paid"
    })
  });
  requireOk(paymentConfirm, "POST /api/payment/confirm paid");

  const fullReport = await api(`/api/report/${reportId}`);
  requireOk(fullReport, "GET /api/report/:reportId");

  logStep("share + invite + daily");
  const share = await api("/api/share/card", {
    method: "POST",
    body: JSON.stringify({ sessionId, reportId })
  });
  requireOk(share, "POST /api/share/card");

  const inviteCreate = await api("/api/invite/create", {
    method: "POST",
    body: JSON.stringify({ sessionId, reportId })
  });
  if (requireOk(inviteCreate, "POST /api/invite/create")) {
    const code = inviteCreate.json?.invite?.code;
    if (code) {
      ok("invite code created");

      const inviteRedeem = await api("/api/invite/redeem", {
        method: "POST",
        body: JSON.stringify({
          code,
          partnerName: "상대테스트"
        })
      });
      requireOk(inviteRedeem, "POST /api/invite/redeem");
    }
  }

  const daily = await api("/api/daily/today");
  requireOk(daily, "GET /api/daily/today");

  summarizeAndExit();
}

function summarizeAndExit() {
  if (errors.length === 0) {
    console.log("\n[RESULT] STAGING VALIDATION PASSED");
    process.exit(0);
  }

  console.error("\n[RESULT] STAGING VALIDATION FAILED");
  for (const message of errors) {
    console.error(` - ${message}`);
  }
  process.exit(1);
}

run().catch((error) => {
  console.error("[FATAL]", error?.message ?? error);
  process.exit(1);
});
