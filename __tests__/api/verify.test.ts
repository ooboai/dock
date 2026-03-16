import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/anchors/verify/route";

const API_KEY = "test-secret-key-123";

beforeAll(() => {
  process.env.SECRET_API_KEY = API_KEY;
});

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/anchors/verify", {
    method: "GET",
    headers,
  });
}

describe("GET /api/anchors/verify", () => {
  it("returns 200 with valid API key", async () => {
    const response = await GET(makeRequest({ Authorization: `Bearer ${API_KEY}` }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ valid: true });
  });

  it("returns 401 with invalid API key", async () => {
    const response = await GET(makeRequest({ Authorization: "Bearer wrong-key" }));
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("invalid_token");
  });

  it("returns 401 with missing Authorization header", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("invalid_token");
  });

  it("returns 401 with malformed Authorization header", async () => {
    const response = await GET(makeRequest({ Authorization: "Basic abc123" }));
    expect(response.status).toBe(401);
  });
});
