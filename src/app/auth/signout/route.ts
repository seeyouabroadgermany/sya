import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOut(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const reason = request.nextUrl.searchParams.get("reason");
  return NextResponse.redirect(new URL(reason === "disabled" ? "/login?disabled=1" : "/login", request.url), {
    status: 303,
  });
}

export const GET = signOut;
export const POST = signOut;
