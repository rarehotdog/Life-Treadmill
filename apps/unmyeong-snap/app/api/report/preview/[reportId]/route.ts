import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { getPreviewReport } from "@/lib/store";

export async function GET(_: Request, context: { params: { reportId: string } }) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const preview = await getPreviewReport(context.params.reportId);
  if (!preview) {
    return fail("미리보기 리포트를 찾을 수 없습니다.", 404);
  }

  return ok({ preview });
}
