import { nanoid } from "nanoid";

import { getOrCreateConsent, getSession } from "@/lib/store";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  AttributionParams,
  ConsentState,
  EventDeliveryLog,
  TelemetryDeliveryStatus,
  TelemetryDestinationStatus,
  TelemetryEvent,
  TelemetryEventType,
  TelemetryRetryDestination
} from "@/lib/types";

const META_EVENT_MAP: Record<string, string> = {
  preview_viewed: "ViewContent",
  payment_create_requested: "InitiateCheckout",
  payment_confirmed: "Purchase"
};

const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 360] as const;

export interface TelemetryRequestContext {
  ip?: string;
  userAgent?: string;
  url?: string;
}

export interface TrackServerEventInput {
  eventId?: string;
  eventName: string;
  eventType?: TelemetryEventType;
  eventTime?: string;
  sessionId?: string;
  pagePath?: string;
  sourceChannel?: string;
  consentSnapshot?: ConsentState;
  payload?: Record<string, unknown>;
  context?: TelemetryRequestContext;
  disableFanOut?: boolean;
}

export interface TelemetryDestinationHealth {
  stage: "staging" | "production";
  amplitudeConfigured: boolean;
  metaConfigured: boolean;
  missingKeys: string[];
}

export function isStagingEnv() {
  return (
    process.env.UNMYEONG_STAGE === "staging" ||
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

function envValue(key: string) {
  return (process.env[key] ?? "").trim();
}

function getAmplitudeRuntimeConfig() {
  const stage = isStagingEnv();
  const stagingKey = envValue("AMPLITUDE_API_KEY_STAGING");
  const productionKey = envValue("AMPLITUDE_API_KEY");
  const apiKey = stage ? stagingKey || productionKey : productionKey;

  const missingKeys: string[] = [];
  if (!apiKey) {
    missingKeys.push(stage ? "AMPLITUDE_API_KEY_STAGING" : "AMPLITUDE_API_KEY");
  }

  if (stage && !stagingKey) {
    missingKeys.push("AMPLITUDE_API_KEY_STAGING");
  }

  return {
    apiKey,
    missingKeys
  };
}

function getMetaRuntimeConfig() {
  const stage = isStagingEnv();
  const stagingPixelId = envValue("META_TEST_PIXEL_ID");
  const productionPixelId = envValue("META_PIXEL_ID");
  const pixelId = stage ? stagingPixelId || productionPixelId : productionPixelId;
  const accessToken = envValue("META_ACCESS_TOKEN");

  const missingKeys: string[] = [];
  if (!pixelId) {
    missingKeys.push(stage ? "META_TEST_PIXEL_ID" : "META_PIXEL_ID");
  }

  if (stage && !stagingPixelId) {
    missingKeys.push("META_TEST_PIXEL_ID");
  }

  if (!accessToken) {
    missingKeys.push("META_ACCESS_TOKEN");
  }

  return {
    pixelId,
    accessToken,
    missingKeys
  };
}

function getAmplitudeApiKey() {
  return getAmplitudeRuntimeConfig().apiKey;
}

function getMetaPixelId() {
  return getMetaRuntimeConfig().pixelId;
}

function getMetaAccessToken() {
  return getMetaRuntimeConfig().accessToken;
}

function getMetaTestEventCode() {
  if (isStagingEnv()) {
    return envValue("META_TEST_EVENT_CODE");
  }
  return "";
}

function toAttribution(payload: Record<string, unknown>): AttributionParams {
  return {
    campaign_id: typeof payload.campaign_id === "string" ? payload.campaign_id : undefined,
    click_source: typeof payload.click_source === "string" ? payload.click_source : undefined,
    partition: typeof payload.partition === "string" ? payload.partition : undefined,
    ua_creative_topic: typeof payload.ua_creative_topic === "string" ? payload.ua_creative_topic : undefined,
    utm_source: typeof payload.utm_source === "string" ? payload.utm_source : undefined,
    source: typeof payload.source === "string" ? payload.source : undefined,
    mode: typeof payload.mode === "string" ? payload.mode : undefined
  };
}

function normalizeDelivery(
  eventType: TelemetryEventType,
  consentMarketing: boolean,
  eventName: string
): TelemetryDeliveryStatus {
  const hasMetaMapping = Boolean(META_EVENT_MAP[eventName]);

  return {
    amplitude: "pending",
    meta: eventType === "marketing" && consentMarketing && hasMetaMapping ? "pending" : "skipped"
  };
}

function toDbEventRow(event: TelemetryEvent) {
  return {
    event_id: event.eventId,
    event_name: event.eventName,
    event_type: event.eventType,
    event_time: event.eventTime,
    session_id: event.sessionId ?? null,
    page_path: event.pagePath,
    source_channel: event.sourceChannel,
    consent_marketing: event.consentMarketing,
    payload: event.payload,
    campaign_id: event.attribution.campaign_id ?? null,
    click_source: event.attribution.click_source ?? null,
    partition: event.attribution.partition ?? null,
    ua_creative_topic: event.attribution.ua_creative_topic ?? null,
    utm_source: event.attribution.utm_source ?? null,
    source: event.attribution.source ?? null,
    mode: event.attribution.mode ?? null,
    delivery_amplitude: event.delivery.amplitude,
    delivery_meta: event.delivery.meta,
    retry_count: event.retryCount,
    created_at: event.createdAt
  };
}

function toDbDeliveryLog(log: EventDeliveryLog) {
  return {
    event_id: log.eventId,
    destination: log.destination,
    status: log.status,
    attempt: log.attempt,
    error: log.error ?? null,
    created_at: log.createdAt
  };
}

export async function writeDeliveryLog(log: EventDeliveryLog) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("event_delivery_logs")
    .insert(toDbDeliveryLog(log) as never)
    .throwOnError();
}

export async function updateEventDelivery(eventId: string, delivery: TelemetryDeliveryStatus, retryCount: number) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("telemetry_events")
    .update({
      delivery_amplitude: delivery.amplitude,
      delivery_meta: delivery.meta,
      retry_count: retryCount
    } as never)
    .eq("event_id", eventId as never)
    .throwOnError();
}

export async function getTelemetryEvent(eventId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("telemetry_events")
    .select("*")
    .eq("event_id", eventId as never)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toTelemetryEvent(data);
}

function getRetryBackoffMinutes(nextAttempt: number) {
  const index = Math.min(Math.max(nextAttempt, 1), RETRY_BACKOFF_MINUTES.length) - 1;
  return RETRY_BACKOFF_MINUTES[index];
}

function addMinutes(iso: string, minutes: number) {
  const base = new Date(iso).getTime();
  return new Date(base + minutes * 60_000).toISOString();
}

export async function upsertRetryQueueJob(
  eventId: string,
  destination: TelemetryRetryDestination,
  error: string
) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing, error: readError } = await supabase
    .from("telemetry_delivery_queue")
    .select("attempt_count, status")
    .eq("event_id", eventId as never)
    .eq("destination", destination as never)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (!existing) {
    await supabase
      .from("telemetry_delivery_queue")
      .insert({
        event_id: eventId,
        destination,
        status: "pending",
        attempt_count: 0,
        next_retry_at: addMinutes(now, getRetryBackoffMinutes(1)),
        last_error: redactLongError(error),
        locked_at: null,
        created_at: now,
        updated_at: now
      } as never)
      .throwOnError();
    return;
  }

  const existingRow = existing as Record<string, unknown>;

  if (existingRow.status === "dead") {
    return;
  }

  const attemptCount = Number(existingRow.attempt_count ?? 0);
  const nextAttempt = attemptCount + 1;

  await supabase
    .from("telemetry_delivery_queue")
    .update({
      status: "pending",
      next_retry_at: addMinutes(now, getRetryBackoffMinutes(nextAttempt)),
      last_error: redactLongError(error),
      locked_at: null,
      updated_at: now
    } as never)
    .eq("event_id", eventId as never)
    .eq("destination", destination as never)
    .throwOnError();
}

export async function markRetryQueueSent(eventId: string, destination: TelemetryRetryDestination) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase
    .from("telemetry_delivery_queue")
    .update({
      status: "sent",
      locked_at: null,
      last_error: null,
      updated_at: now
    } as never)
    .eq("event_id", eventId as never)
    .eq("destination", destination as never)
    .in("status", ["pending", "processing", "failed"] as never)
    .throwOnError();
}

export function toTelemetryEvent(row: Record<string, unknown>): TelemetryEvent {
  return {
    eventId: String(row.event_id),
    eventName: String(row.event_name),
    eventType: row.event_type as TelemetryEventType,
    eventTime: String(row.event_time),
    sessionId: typeof row.session_id === "string" ? row.session_id : undefined,
    pagePath: String(row.page_path),
    sourceChannel: String(row.source_channel),
    consentMarketing: Boolean(row.consent_marketing),
    payload: (row.payload as Record<string, unknown>) ?? {},
    attribution: {
      campaign_id: typeof row.campaign_id === "string" ? row.campaign_id : undefined,
      click_source: typeof row.click_source === "string" ? row.click_source : undefined,
      partition: typeof row.partition === "string" ? row.partition : undefined,
      ua_creative_topic: typeof row.ua_creative_topic === "string" ? row.ua_creative_topic : undefined,
      utm_source: typeof row.utm_source === "string" ? row.utm_source : undefined,
      source: typeof row.source === "string" ? row.source : undefined,
      mode: typeof row.mode === "string" ? row.mode : undefined
    },
    delivery: {
      amplitude: row.delivery_amplitude as TelemetryDeliveryStatus["amplitude"],
      meta: row.delivery_meta as TelemetryDeliveryStatus["meta"]
    },
    retryCount: Number(row.retry_count ?? 0),
    createdAt: String(row.created_at)
  };
}

function redactLongError(value: string) {
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}

export async function postAmplitude(event: TelemetryEvent) {
  const apiKey = getAmplitudeApiKey();
  if (!apiKey) {
    throw new Error("Amplitude API key is missing");
  }

  const response = await fetch("https://api2.amplitude.com/2/httpapi", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: apiKey,
      events: [
        {
          event_type: event.eventName,
          event_id: event.eventId,
          time: new Date(event.eventTime).getTime(),
          device_id: event.sessionId,
          user_id: event.sessionId,
          platform: "Web",
          event_properties: {
            ...event.payload,
            page_path: event.pagePath,
            source_channel: event.sourceChannel,
            consent_marketing: event.consentMarketing,
            campaign_id: event.attribution.campaign_id,
            click_source: event.attribution.click_source,
            partition: event.attribution.partition,
            ua_creative_topic: event.attribution.ua_creative_topic,
            utm_source: event.attribution.utm_source,
            source: event.attribution.source,
            mode: event.attribution.mode
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Amplitude HTTP ${response.status}: ${redactLongError(text)}`);
  }
}

export async function postMeta(event: TelemetryEvent, context?: TelemetryRequestContext) {
  const mappedEventName = META_EVENT_MAP[event.eventName];
  if (!mappedEventName) {
    return "skipped" as const;
  }

  const pixelId = getMetaPixelId();
  const accessToken = getMetaAccessToken();

  if (!pixelId || !accessToken) {
    throw new Error("Meta test pixel or access token is missing");
  }

  const value = typeof event.payload.amount_krw === "number" ? event.payload.amount_krw : undefined;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: mappedEventName,
        event_time: Math.floor(new Date(event.eventTime).getTime() / 1000),
        event_id: event.eventId,
        action_source: "website",
        event_source_url: context?.url,
        user_data: {
          client_ip_address: context?.ip,
          client_user_agent: context?.userAgent
        },
        custom_data: {
          currency: "KRW",
          value,
          report_id: event.payload.report_id,
          product_code: event.payload.product_code,
          order_id: event.payload.order_id,
          payment_status: event.payload.payment_status,
          campaign_id: event.attribution.campaign_id,
          click_source: event.attribution.click_source,
          partition: event.attribution.partition,
          ua_creative_topic: event.attribution.ua_creative_topic,
          utm_source: event.attribution.utm_source,
          source: event.attribution.source,
          mode: event.attribution.mode
        }
      }
    ]
  };

  const testEventCode = getMetaTestEventCode();
  if (testEventCode) {
    body.test_event_code = testEventCode;
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meta HTTP ${response.status}: ${redactLongError(text)}`);
  }

  return "sent" as const;
}

export async function sendTelemetryToDestination(
  event: TelemetryEvent,
  destination: TelemetryRetryDestination,
  context?: TelemetryRequestContext
): Promise<Extract<TelemetryDestinationStatus, "sent" | "skipped">> {
  if (destination === "amplitude") {
    await postAmplitude(event);
    return "sent";
  }

  return postMeta(event, context);
}

export async function persistTelemetryDeliveryFailed(
  parent: TelemetryEvent,
  destination: TelemetryRetryDestination,
  error: string
) {
  if (parent.eventName === "telemetry_delivery_failed") {
    return;
  }

  const now = new Date().toISOString();
  const event: TelemetryEvent = {
    eventId: nanoid(16),
    eventName: "telemetry_delivery_failed",
    eventType: "system",
    eventTime: now,
    sessionId: parent.sessionId,
    pagePath: "/api/telemetry",
    sourceChannel: "server",
    consentMarketing: false,
    payload: {
      parent_event_id: parent.eventId,
      parent_event_name: parent.eventName,
      destination,
      error
    },
    attribution: parent.attribution,
    delivery: {
      amplitude: "failed",
      meta: "skipped"
    },
    retryCount: 0,
    createdAt: now
  };

  const supabase = getSupabaseAdmin();
  await supabase
    .from("telemetry_events")
    .insert(toDbEventRow(event) as never)
    .throwOnError();
}

async function onDeliverySuccess(
  eventId: string,
  destination: TelemetryRetryDestination,
  status: Extract<TelemetryDestinationStatus, "sent" | "skipped">
) {
  await writeDeliveryLog({
    eventId,
    destination,
    status,
    attempt: status === "skipped" ? 0 : 1,
    createdAt: new Date().toISOString()
  });

  if (status === "sent") {
    try {
      await markRetryQueueSent(eventId, destination);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "queue sent update failed";
      console.error(`[telemetry] mark queue sent failed: ${message}`);
    }
  }
}

async function onDeliveryFailure(event: TelemetryEvent, destination: TelemetryRetryDestination, error: string) {
  await writeDeliveryLog({
    eventId: event.eventId,
    destination,
    status: "failed",
    attempt: 1,
    error: redactLongError(error),
    createdAt: new Date().toISOString()
  });

  try {
    await upsertRetryQueueJob(event.eventId, destination, error);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "queue upsert failed";
    console.error(`[telemetry] queue upsert failed: ${message}`);
  }

  await persistTelemetryDeliveryFailed(event, destination, error);
}

async function deliverRealtimeDestination(
  event: TelemetryEvent,
  destination: TelemetryRetryDestination,
  context?: TelemetryRequestContext
): Promise<{ status: TelemetryDestinationStatus; failed: boolean }> {
  try {
    const status = await sendTelemetryToDestination(event, destination, context);
    await onDeliverySuccess(event.eventId, destination, status);
    return {
      status,
      failed: false
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : `${destination} delivery failed`;
    await onDeliveryFailure(event, destination, message);
    return {
      status: "failed",
      failed: true
    };
  }
}

export async function trackServerEvent(input: TrackServerEventInput) {
  const now = new Date().toISOString();
  const payload = input.payload ?? {};
  const session = await getSession(input.sessionId);

  const consent =
    input.consentSnapshot ??
    (session?.sessionId
      ? await getOrCreateConsent(session.sessionId)
      : { essentialAnalytics: true, marketingTracking: false, updatedAt: now });

  const attributionFromPayload = toAttribution(payload);
  const attribution =
    Object.values(attributionFromPayload).some((value) => Boolean(value))
      ? attributionFromPayload
      : session?.attribution ?? {};

  const eventType = input.eventType ?? "product";
  const event: TelemetryEvent = {
    eventId: input.eventId ?? nanoid(16),
    eventName: input.eventName,
    eventType,
    eventTime: input.eventTime ?? now,
    sessionId: session?.sessionId ?? input.sessionId,
    pagePath: input.pagePath ?? "/",
    sourceChannel: input.sourceChannel ?? "web",
    consentMarketing: consent.marketingTracking,
    payload,
    attribution,
    delivery: normalizeDelivery(eventType, consent.marketingTracking, input.eventName),
    retryCount: 0,
    createdAt: now
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("telemetry_events")
    .insert(toDbEventRow(event) as never);

  if (error) {
    if (error.code === "23505") {
      const existing = await getTelemetryEvent(event.eventId);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }

  if (input.disableFanOut) {
    return event;
  }

  const delivery: TelemetryDeliveryStatus = { ...event.delivery };
  let retryCount = event.retryCount;

  const amplitudeResult = await deliverRealtimeDestination(event, "amplitude", input.context);
  delivery.amplitude = amplitudeResult.status === "sent" ? "sent" : "failed";
  if (amplitudeResult.failed) {
    retryCount += 1;
  }

  if (delivery.meta === "skipped") {
    await onDeliverySuccess(event.eventId, "meta", "skipped");
  } else {
    const metaResult = await deliverRealtimeDestination(event, "meta", input.context);
    delivery.meta = metaResult.status;
    if (metaResult.failed) {
      retryCount += 1;
    }
  }

  await updateEventDelivery(event.eventId, delivery, retryCount);

  return {
    ...event,
    delivery,
    retryCount
  };
}

export function getTelemetryDestinationsHealth(): TelemetryDestinationHealth {
  const amplitude = getAmplitudeRuntimeConfig();
  const meta = getMetaRuntimeConfig();

  return {
    stage: isStagingEnv() ? "staging" : "production",
    amplitudeConfigured: Boolean(amplitude.apiKey) && amplitude.missingKeys.length === 0,
    metaConfigured: Boolean(meta.pixelId && meta.accessToken) && meta.missingKeys.length === 0,
    missingKeys: [...amplitude.missingKeys, ...meta.missingKeys]
  };
}
