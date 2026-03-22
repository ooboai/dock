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
    const rawSessionTranscripts = Array.isArray(body.session_transcripts)
      ? body.session_transcripts as Array<Record<string, unknown>>
      : undefined;

    if (rawSessionTranscripts) {
      for (const st of rawSessionTranscripts) {
        if (typeof st.session_id !== "string" || !st.session_id) {
          return NextResponse.json(
            { success: false, message: "Each session_transcript must have a session_id string" },
            { status: 422 }
          );
        }
        if (!Array.isArray(st.messages)) {
          return NextResponse.json(
            { success: false, message: "Each session_transcript must have a messages array" },
            { status: 422 }
          );
        }
      }
    }

    const sessionTranscripts = rawSessionTranscripts as Array<{
      session_id: string;
      parent_session_id?: string;
      subagent_type?: string;
      messages: unknown[];
    }> | undefined;

    const created = await prisma.$transaction(async (tx) => {
      const anchor_record = await tx.anchor.create({
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

      if (sessionTranscripts && sessionTranscripts.length > 0) {
        await tx.sessionTranscript.createMany({
          data: sessionTranscripts.map((st) => ({
            anchorId: anchor_record.id,
            sessionId: st.session_id,
            parentSessionId: st.parent_session_id ?? null,
            subagentType: st.subagent_type ?? null,
            messages: st.messages as object,
          })),
        });
      }

      return anchor_record;
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
