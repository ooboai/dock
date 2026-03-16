import { NextRequest, NextResponse } from "next/server";

export function validateApiKey(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "invalid_token", message: "Missing or malformed Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (token !== process.env.SECRET_API_KEY) {
    return NextResponse.json(
      { error: "invalid_token", message: "API key is invalid" },
      { status: 401 }
    );
  }

  return null;
}
