import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, fail, ok } from "@/lib/api";
import { getSessionIdFromRequest } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";
import { telemetryLegacySchema, telemetryV2Schema } from "@/lib/validators";

const metaEventNames = new Set(["preview_viewed", "payment_create_requested", "payment_confirmed"]);

function getContext(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();

  return {
    ip: ip || undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    url: request.nextUrl.toString()
  };
}

function inferTypeFromLegacyEvent(name: string) {
  return metaEventNames.has(name) ? "marketing" : "product";
}

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json) {
    return fail("유효한 JSON body가 필요합니다.", 400);
  }

  const parsedV2 = telemetryV2Schema.safeParse(json);

  try {
    if (parsedV2.success) {
      const payload = parsedV2.data;
      const context = getContext(request);
      const event = await trackServerEvent({
        eventId: payload.eventId,
        eventName: payload.eventName,
        eventType: payload.eventType,
        eventTime: payload.eventTime,
        sessionId: getSessionIdFromRequest(payload.sessionId ?? undefined) ?? undefined,
        pagePath: payload.pagePath,
        sourceChannel: payload.sourceChannel,
        consentSnapshot: payload.consentSnapshot,
        payload: payload.payload,
        context: {
          ...context,
          url: `${request.nextUrl.origin}${payload.pagePath}`
        }
      });

      return ok({ event }, 201);
    }

    const parsedLegacy = telemetryLegacySchema.safeParse(json);
    if (!parsedLegacy.success) {
      return fail("telemetry payload 검증에 실패했습니다.", 400, {
        v2: parsedV2.error.flatten(),
        legacy: parsedLegacy.error.flatten()
      });
    }

    const payload = parsedLegacy.data;
    const context = getContext(request);
    const event = await trackServerEvent({
      eventName: payload.name,
      eventType: inferTypeFromLegacyEvent(payload.name),
      sessionId: getSessionIdFromRequest(payload.sessionId ?? undefined) ?? undefined,
      pagePath: "/legacy",
      sourceChannel: "web",
      payload: payload.payload,
      context: {
        ...context,
        url: `${request.nextUrl.origin}/legacy`
      }
    });

    return ok({ event, legacy: true }, 201);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "telemetry 저장 실패";
    return fail(message, 500);
  }
}
