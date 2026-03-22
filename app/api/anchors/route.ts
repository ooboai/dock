import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20")));
  const search = params.get("search") ?? "";
  const authorType = params.get("authorType") ?? "";
  const branch = params.get("branch") ?? "";

  const where: Prisma.AnchorWhereInput = {};

  if (search) {
    where.OR = [
      { message: { contains: search, mode: "insensitive" } },
      { author: { contains: search, mode: "insensitive" } },
      { branch: { contains: search, mode: "insensitive" } },
      { commitHash: { startsWith: search } },
    ];
  }

  if (authorType) {
    where.authorType = authorType;
  }

  if (branch) {
    where.branch = branch;
  }

  const [anchors, total, stats, branches] = await Promise.all([
    prisma.anchor.findMany({
      where,
      orderBy: { committedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      // TODO: include sessionTranscripts when per-session transcript UI is built
      include: { transcript: true },
    }),
    prisma.anchor.count({ where }),
    prisma.anchor.aggregate({
      where,
      _sum: { added: true, deleted: true, aiAdded: true, aiDeleted: true },
      _count: true,
    }),
    prisma.anchor.findMany({
      select: { branch: true },
      distinct: ["branch"],
      where: { branch: { not: null } },
      orderBy: { branch: "asc" },
    }),
  ]);

  let totalTokens = 0;
  for (const anchor of anchors) {
    const payload = anchor.payload as Record<string, unknown>;
    const anchorData = payload?.anchor as Record<string, unknown> | undefined;
    const sessions = (anchorData?.sessions as Array<Record<string, unknown>>) ?? [];
    for (const session of sessions) {
      totalTokens += Number(session.input_tokens ?? 0) + Number(session.output_tokens ?? 0);
    }
  }

  // For the full token count, query all matching anchors if filtered
  let allTokens = totalTokens;
  if (total > limit) {
    const allAnchors = await prisma.anchor.findMany({
      where,
      select: { payload: true },
    });
    allTokens = 0;
    for (const a of allAnchors) {
      const payload = a.payload as Record<string, unknown>;
      const anchorData = payload?.anchor as Record<string, unknown> | undefined;
      const sessions = (anchorData?.sessions as Array<Record<string, unknown>>) ?? [];
      for (const session of sessions) {
        allTokens += Number(session.input_tokens ?? 0) + Number(session.output_tokens ?? 0);
      }
    }
  }

  return NextResponse.json({
    anchors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      count: stats._count,
      added: stats._sum.added ?? 0,
      deleted: stats._sum.deleted ?? 0,
      aiAdded: stats._sum.aiAdded ?? 0,
      aiDeleted: stats._sum.aiDeleted ?? 0,
      totalTokens: allTokens,
    },
    branches: branches.map((b) => b.branch).filter(Boolean),
  });
}
