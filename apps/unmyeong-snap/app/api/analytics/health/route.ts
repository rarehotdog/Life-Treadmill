import { ensureSupabaseOrFail, fail, ok } from "@/lib/api";
import { getTelemetryDeliveryQueueSummary } from "@/lib/analytics-retry";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getTelemetryDestinationsHealth } from "@/lib/telemetry";

const REQUIRED_TABLES = [
  "sessions",
  "profiles",
  "preview_reports",
  "full_reports",
  "payment_orders",
  "entitlements",
  "share_cards",
  "invites",
  "user_consents",
  "attribution_snapshots",
  "telemetry_events",
  "event_delivery_logs",
  "telemetry_delivery_queue"
] as const;

async function findMissingTables() {
  const supabase = getSupabaseAdmin();
  const missing: string[] = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      missing.push(table);
    }
  }

  return missing;
}

export async function GET() {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  try {
    const missingTables = await findMissingTables();
    if (missingTables.length > 0) {
      return fail("Supabase schema is missing required tables.", 500, {
        missingTables,
        migrationFile:
          "supabase/schema.sql + supabase/migrations/20260303_analytics_retry_queue.sql"
      });
    }

    const destinations = getTelemetryDestinationsHealth();
    const queueSummary = await getTelemetryDeliveryQueueSummary();

    return ok({
      ok: destinations.amplitudeConfigured && destinations.metaConfigured,
      supabase: "connected",
      destinations,
      deliveryQueue: queueSummary,
      missingConfigKeys: destinations.missingKeys,
      checkedAt: new Date().toISOString()
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "analytics health check failed";
    return fail(message, 500);
  }
}
