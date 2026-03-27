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

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/anchors/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
}

describe("line_attributions in ingest payload", () => {
  it("accepts and stores payload with line_attributions (v0.1.14)", async () => {
    const payload = {
      event: "git.commit",
      oobo_version: "0.1.14",
      project: { name: "my-app", git_remote: "github.com/user/my-app" },
      anchor: {
        commit_hash: "line-attr-001",
        branch: "main",
        author: "Dev <dev@co.com>",
        author_type: "assisted",
        message: "feat: add auth",
        ai_percentage: 66.7,
        added: 45,
        deleted: 3,
        ai_added: 30,
        ai_deleted: 0,
        committed_at: 1773282899,
        file_changes: [
          {
            path: "src/auth.rs",
            added: 45,
            deleted: 3,
            attribution: "ai",
            agent: "claude",
            line_attributions: [
              {
                author: "ai",
                ranges: [{ start: 1, end: 30 }, { start: 40, end: 45 }],
                agent: "claude",
              },
              {
                author: "human",
                ranges: [{ start: 31, end: 39 }],
              },
            ],
          },
        ],
        sessions: [],
      },
    };

    mockCreate.mockResolvedValue({ id: "cuid-line-attr" });

    const response = await POST(makeRequest(payload));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    const stored = mockCreate.mock.calls[0][0].data.payload;
    const fc = stored.anchor.file_changes[0];
    expect(fc.line_attributions).toHaveLength(2);
    expect(fc.line_attributions[0].author).toBe("ai");
    expect(fc.line_attributions[0].ranges).toEqual([{ start: 1, end: 30 }, { start: 40, end: 45 }]);
    expect(fc.line_attributions[0].agent).toBe("claude");
    expect(fc.line_attributions[1].author).toBe("human");
    expect(fc.line_attributions[1].agent).toBeUndefined();
  });

  it("accepts payload without line_attributions (backward compat)", async () => {
    const payload = {
      event: "git.commit",
      oobo_version: "0.1.12",
      project: { name: "my-app", git_remote: "github.com/user/my-app" },
      anchor: {
        commit_hash: "no-line-attr-001",
        branch: "main",
        author: "Dev <dev@co.com>",
        author_type: "assisted",
        message: "fix: typo",
        added: 1,
        deleted: 1,
        ai_added: 0,
        ai_deleted: 0,
        committed_at: 1773282899,
        file_changes: [
          { path: "README.md", added: 1, deleted: 1, attribution: "human" },
        ],
        sessions: [],
      },
    };

    mockCreate.mockResolvedValue({ id: "cuid-no-line" });

    const response = await POST(makeRequest(payload));
    expect(response.status).toBe(200);

    const stored = mockCreate.mock.calls[0][0].data.payload;
    expect(stored.anchor.file_changes[0].line_attributions).toBeUndefined();
  });

  it("handles mixed author line_attributions", async () => {
    const payload = {
      event: "git.commit",
      oobo_version: "0.1.14",
      project: { name: "my-app", git_remote: "github.com/user/my-app" },
      anchor: {
        commit_hash: "mixed-attr-001",
        branch: "feat/mixed",
        author: "Dev <dev@co.com>",
        author_type: "assisted",
        message: "feat: mixed changes",
        added: 20,
        deleted: 0,
        ai_added: 15,
        ai_deleted: 0,
        committed_at: 1773282899,
        file_changes: [
          {
            path: "src/lib.rs",
            added: 20,
            deleted: 0,
            attribution: "mixed",
            agent: "cursor",
            line_attributions: [
              {
                author: "mixed",
                ranges: [{ start: 1, end: 20 }],
                agent: "cursor",
              },
            ],
          },
        ],
        sessions: [],
      },
    };

    mockCreate.mockResolvedValue({ id: "cuid-mixed" });

    const response = await POST(makeRequest(payload));
    expect(response.status).toBe(200);

    const stored = mockCreate.mock.calls[0][0].data.payload;
    expect(stored.anchor.file_changes[0].line_attributions[0].author).toBe("mixed");
  });
});
