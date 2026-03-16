import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  return NextResponse.json({ email: "admin" });
}
