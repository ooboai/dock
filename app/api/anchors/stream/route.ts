import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since");

  const where = since ? { createdAt: { gt: new Date(since) } } : {};

  const anchors = await prisma.anchor.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ anchors, timestamp: new Date().toISOString() });
}
