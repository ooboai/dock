import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LineAttribution } from "@/lib/types";

interface RouteParams {
  params: Promise<{ commitHash: string; filePath: string[] }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { commitHash, filePath } = await params;
  const path = filePath.join("/");

  const anchor = await prisma.anchor.findFirst({
    where: { commitHash },
    select: { payload: true },
  });

  if (!anchor) {
    return NextResponse.json(
      { error: "not_found", message: "Anchor not found" },
      { status: 404 }
    );
  }

  const payload = anchor.payload as Record<string, unknown>;
  const anchorData = payload?.anchor as Record<string, unknown> | undefined;
  const fileChanges = (anchorData?.file_changes as Array<Record<string, unknown>>) ?? [];

  const file = fileChanges.find((f) => f.path === path);

  if (!file) {
    return NextResponse.json(
      { error: "not_found", message: "File not found in this commit" },
      { status: 404 }
    );
  }

  const lineAttributions = (file.line_attributions as LineAttribution[] | undefined) ?? null;

  return NextResponse.json({
    commit_hash: commitHash,
    path,
    attribution: file.attribution ?? null,
    agent: file.agent ?? null,
    added: file.added ?? 0,
    deleted: file.deleted ?? 0,
    line_attributions: lineAttributions,
  });
}
