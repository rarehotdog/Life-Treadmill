import { NextResponse, type NextRequest } from "next/server";

const KEYS = [
  "campaign_id",
  "click_source",
  "partition",
  "ua_creative_topic",
  "utm_source",
  "source",
  "mode"
] as const;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const existingRaw = request.cookies.get("us_utm")?.value;
  let existing: Record<string, string> = {};

  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw) as Record<string, string>;
      existing = parsed;
    } catch {
      existing = {};
    }
  }

  const snapshot = Object.fromEntries(
    KEYS.map((key) => {
      const fromQuery = request.nextUrl.searchParams.get(key);
      return [key, fromQuery ?? existing[key] ?? ""];
    })
  ) as Record<string, string>;

  if (Object.values(snapshot).some((value) => value.length > 0)) {
    response.cookies.set("us_utm", JSON.stringify(snapshot), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
