import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const API_KEY = "test-secret-key-456";

const mockCreate = vi.fn();
const mockCreateMany = vi.fn();

const txClient = {
  anchor: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
  sessionTranscript: {
    createMany: (...args: unknown[]) => mockCreateMany(...args),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient),
  },
}));

import { POST } from "@/app/api/anchors/ingest/route";

beforeAll(() => {
  process.env.SECRET_API_KEY = API_KEY;
});

beforeEach(() => {
  mockCreate.mockReset();
  mockCreateMany.mockReset();
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

  it("stores session_transcripts when present (v0.1.11)", async () => {
    const payloadWithSessionTranscripts = {
      ...validPayload,
      oobo_version: "0.1.11",
      session_transcripts: [
        {
          session_id: "sess-root-001",
          messages: [
            { role: "user", text: "Fix the bug" },
            { role: "assistant", text: "Looking into it...", timestamp_ms: 1710500000000 },
          ],
        },
        {
          session_id: "sess-sub-002",
          parent_session_id: "sess-root-001",
          subagent_type: "explore",
          messages: [
            { role: "assistant", tool_call: { tool_use_id: "tc-1", name: "Grep", input_summary: "search for auth" } },
            { role: "tool", tool_result: { tool_use_id: "tc-1", name: "Grep", success: true, output_summary: "3 matches" } },
          ],
        },
      ],
    };

    mockCreate.mockResolvedValue({ id: "cuid-789" });
    mockCreateMany.mockResolvedValue({ count: 2 });

    const response = await POST(makeRequest(payloadWithSessionTranscripts));
    expect(response.status).toBe(200);

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          anchorId: "cuid-789",
          sessionId: "sess-root-001",
          parentSessionId: null,
          subagentType: null,
          messages: payloadWithSessionTranscripts.session_transcripts[0].messages,
        },
        {
          anchorId: "cuid-789",
          sessionId: "sess-sub-002",
          parentSessionId: "sess-root-001",
          subagentType: "explore",
          messages: payloadWithSessionTranscripts.session_transcripts[1].messages,
        },
      ],
    });
  });

  it("skips session_transcripts when absent (backward compat)", async () => {
    mockCreate.mockResolvedValue({ id: "cuid-old" });

    const response = await POST(makeRequest(validPayload));
    expect(response.status).toBe(200);

    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("skips session_transcripts when empty array", async () => {
    const payloadWithEmpty = {
      ...validPayload,
      session_transcripts: [],
    };

    mockCreate.mockResolvedValue({ id: "cuid-empty" });

    const response = await POST(makeRequest(payloadWithEmpty));
    expect(response.status).toBe(200);

    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("ingests v0.1.11 payload with all new anchor fields", async () => {
    const v0111Payload = {
      ...validPayload,
      oobo_version: "0.1.11",
      anchor: {
        ...validPayload.anchor,
        sessions: [
          {
            session_id: "sess-root",
            agent: "cursor",
            model: "claude-sonnet-4",
            input_tokens: 50000,
            output_tokens: 12000,
            duration_secs: 180,
            tool_calls: 15,
            tool_usage: { Edit: 5, Read: 8, Bash: 2 },
            tool_failures: 1,
            subagent_count: 2,
            thinking_duration_ms: 4500,
            compact_count: 0,
            is_subagent: false,
          },
          {
            session_id: "sess-sub-1",
            agent: "cursor",
            model: "claude-sonnet-4",
            input_tokens: 8000,
            output_tokens: 2000,
            is_subagent: true,
            parent_session_id: "sess-root",
            subagent_type: "explore",
            peer_session_ids: ["sess-sub-2"],
          },
        ],
        file_interactions: [
          {
            path: "src/auth.rs",
            sessions: [
              { session_id: "sess-root", role: "writer" },
              { session_id: "sess-sub-1", role: "reader" },
            ],
          },
        ],
      },
    };

    mockCreate.mockResolvedValue({ id: "cuid-v0111" });

    const response = await POST(makeRequest(v0111Payload));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    const createCall = mockCreate.mock.calls[0][0];
    const storedPayload = createCall.data.payload;
    expect(storedPayload.anchor.file_interactions).toHaveLength(1);
    expect(storedPayload.anchor.sessions[0].tool_usage).toEqual({ Edit: 5, Read: 8, Bash: 2 });
    expect(storedPayload.anchor.sessions[1].is_subagent).toBe(true);
    expect(storedPayload.anchor.sessions[1].subagent_type).toBe("explore");
  });

  it("returns 500 and rolls back when session_transcript insert fails", async () => {
    const payloadWithBadTranscripts = {
      ...validPayload,
      session_transcripts: [
        { session_id: "sess-ok", messages: [{ role: "user", text: "hi" }] },
      ],
    };

    mockCreate.mockResolvedValue({ id: "cuid-rollback" });
    mockCreateMany.mockRejectedValue(new Error("DB constraint violation"));

    const response = await POST(makeRequest(payloadWithBadTranscripts));
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it("returns 422 when session_transcript entry has no session_id", async () => {
    const payloadMissingSessionId = {
      ...validPayload,
      session_transcripts: [
        { messages: [{ role: "user", text: "hi" }] },
      ],
    };

    const response = await POST(makeRequest(payloadMissingSessionId));
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.message).toContain("session_id");
  });

  it("returns 422 when session_transcript entry has non-array messages", async () => {
    const payloadBadMessages = {
      ...validPayload,
      session_transcripts: [
        { session_id: "sess-1", messages: "not-an-array" },
      ],
    };

    const response = await POST(makeRequest(payloadBadMessages));
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.message).toContain("messages");
  });
});
