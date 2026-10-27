import { NextResponse, type NextRequest } from "next/server";
import { runDailyDigest } from "@/lib/digest";
import { todayIST } from "@/lib/format";

// Called by Vercel Cron at 08:00 India time (see vercel.json). Vercel sends the CRON_SECRET as a Bearer token.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const result = await runDailyDigest(todayIST());
  return NextResponse.json({ ok: true, ...result });
}
