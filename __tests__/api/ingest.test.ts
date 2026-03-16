import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const API_KEY = "test-secret-key-456";

const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    anchor: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { POST } from "@/app/api/anchors/ingest/route";

beforeAll(() => {
  process.env.SECRET_API_KEY = API_KEY;
});

beforeEach(() => {
  mockCreate.mockReset();
});

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/anchors/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  event: "git.commit",
  timestamp: "2026-03-15T12:00:00Z",
  oobo_version: "0.1.5",
  project: {
    name: "my-app",
    git_remote: "github.com/user/my-app",
  },
  anchor: {
    commit_hash: "abc123def456",
    branch: "main",
    author: "Dev <dev@co.com>",
    author_type: "assisted",
    message: "feat: add auth flow",
    ai_percentage: 78.79,
    added: 120,
    deleted: 45,
    ai_added: 100,
    ai_deleted: 30,
    committed_at: 1773282899,
    contributors: [],
    file_changes: [],
    sessions: [],
  },
  transcript: [],
};

describe("POST /api/anchors/ingest", () => {
  it("returns 200 for valid payload", async () => {
    mockCreate.mockResolvedValue({ id: "cuid-123" });

    const response = await POST(makeRequest(validPayload));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Anchor ingested");
  });

  it("returns 409 for duplicate anchor", async () => {
    mockCreate.mockRejectedValue({ code: "P2002" });

    const response = await POST(makeRequest(validPayload));
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.message).toBe("Duplicate anchor");
  });

  it("returns 401 with missing Bearer token", async () => {
    const request = new NextRequest("http://localhost:3000/api/anchors/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 with wrong API key", async () => {
    const request = makeRequest(validPayload, { Authorization: "Bearer wrong-key" });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 200 for push event without anchor", async () => {
    const pushPayload = {
      event: "git.push",
      timestamp: "2026-03-15T12:00:00Z",
      project: { name: "my-app", git_remote: "github.com/user/my-app" },
    };

    const response = await POST(makeRequest(pushPayload));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Event received (no anchor)");
  });

  it("returns 422 for malformed JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/anchors/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: "not-json{{{",
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("stores transcript when present", async () => {
    const payloadWithTranscript = {
      ...validPayload,
      transcript: [
        { role: "user", text: "Add auth flow" },
        { role: "assistant", text: "I'll create the auth module..." },
      ],
    };

    mockCreate.mockResolvedValue({ id: "cuid-456" });

    await POST(makeRequest(payloadWithTranscript));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transcript: {
            create: {
              messages: payloadWithTranscript.transcript,
            },
          },
        }),
      })
    );
  });
});
