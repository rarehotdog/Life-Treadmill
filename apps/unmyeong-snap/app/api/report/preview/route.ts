import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { createPreviewReport } from "@/lib/store";
import { getSessionIdFromRequest } from "@/lib/session";
import { previewSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = previewSchema.safeParse(json);

  if (!parsed.success) {
    return fail("미리보기 생성 요청이 유효하지 않습니다.", 400, parsed.error.flatten());
  }

  const sessionId = getSessionIdFromRequest(parsed.data.sessionId);
  if (!sessionId) {
    return fail("세션이 필요합니다.", 401);
  }

  const preview = await createPreviewReport(sessionId);
  if (!preview) {
    return fail("프로필이 없어 미리보기를 생성할 수 없습니다.", 404);
  }

  return ok({ preview }, 201);
}
