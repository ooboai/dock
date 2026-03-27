import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";

const mockFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    anchor: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import { GET } from "@/app/api/anchors/[commitHash]/blame/[...filePath]/route";

beforeAll(() => {
  process.env.SECRET_API_KEY = "test-key";
});

function makeRequest(commitHash: string, filePath: string) {
  return {
    request: new NextRequest(
      `http://localhost:3000/api/anchors/${commitHash}/blame/${filePath}`
    ),
    params: { params: Promise.resolve({ commitHash, filePath: filePath.split("/") }) },
  };
}

describe("GET /api/anchors/:commitHash/blame/:filePath", () => {
  it("returns line_attributions for a file with line data", async () => {
    mockFindFirst.mockResolvedValue({
      payload: {
        anchor: {
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
        },
      },
    });

    const { request, params } = makeRequest("abc123", "src/auth.rs");
    const response = await GET(request, params);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.commit_hash).toBe("abc123");
    expect(body.path).toBe("src/auth.rs");
    expect(body.attribution).toBe("ai");
    expect(body.line_attributions).toHaveLength(2);
    expect(body.line_attributions[0].author).toBe("ai");
    expect(body.line_attributions[0].ranges).toEqual([
      { start: 1, end: 30 },
      { start: 40, end: 45 },
    ]);
  });

  it("returns null line_attributions for old anchors without line data", async () => {
    mockFindFirst.mockResolvedValue({
      payload: {
        anchor: {
          file_changes: [
            { path: "README.md", added: 1, deleted: 1, attribution: "human" },
          ],
        },
      },
    });

    const { request, params } = makeRequest("old-hash", "README.md");
    const response = await GET(request, params);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.line_attributions).toBeNull();
  });

  it("returns 404 when anchor not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const { request, params } = makeRequest("nonexistent", "src/main.rs");
    const response = await GET(request, params);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe("not_found");
  });

  it("returns 404 when file not in commit", async () => {
    mockFindFirst.mockResolvedValue({
      payload: {
        anchor: {
          file_changes: [
            { path: "src/other.rs", added: 10, deleted: 0, attribution: "ai" },
          ],
        },
      },
    });

    const { request, params } = makeRequest("abc123", "src/nonexistent.rs");
    const response = await GET(request, params);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.message).toBe("File not found in this commit");
  });

  it("handles nested file paths correctly", async () => {
    mockFindFirst.mockResolvedValue({
      payload: {
        anchor: {
          file_changes: [
            {
              path: "src/api/handlers/auth.rs",
              added: 20,
              deleted: 5,
              attribution: "ai",
              agent: "cursor",
              line_attributions: [
                { author: "ai", ranges: [{ start: 1, end: 20 }], agent: "cursor" },
              ],
            },
          ],
        },
      },
    });

    const { request, params } = makeRequest("def456", "src/api/handlers/auth.rs");
    const response = await GET(request, params);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.path).toBe("src/api/handlers/auth.rs");
    expect(body.line_attributions).toHaveLength(1);
  });
});
