import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 422 }
    );
  }

  const anchor = body.anchor as Record<string, unknown> | undefined;
  if (!anchor) {
    return NextResponse.json({ success: true, message: "Event received (no anchor)" });
  }

  const project = body.project as Record<string, string> | undefined;
  const gitRemote = project?.git_remote ?? "";
  const commitHash = anchor.commit_hash as string;

  if (!commitHash) {
    return NextResponse.json(
      { success: false, message: "Missing commit_hash" },
      { status: 422 }
    );
  }

  try {
    const created = await prisma.anchor.create({
      data: {
        commitHash,
        gitRemote,
        branch: (anchor.branch as string) ?? null,
        author: (anchor.author as string) ?? null,
        authorType: (anchor.author_type as string) ?? null,
        message: (anchor.message as string) ?? null,
        aiPercentage: anchor.ai_percentage != null ? Number(anchor.ai_percentage) : null,
        added: Number(anchor.added ?? 0),
        deleted: Number(anchor.deleted ?? 0),
        aiAdded: Number(anchor.ai_added ?? 0),
        aiDeleted: Number(anchor.ai_deleted ?? 0),
        committedAt: anchor.committed_at
          ? new Date(Number(anchor.committed_at) * 1000)
          : null,
        payload: body as object,
        transcript:
          Array.isArray(body.transcript) && body.transcript.length > 0
            ? { create: { messages: body.transcript as object } }
            : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Anchor ingested",
      id: created.id,
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Duplicate anchor" },
        { status: 409 }
      );
    }
    console.error("Ingest error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
