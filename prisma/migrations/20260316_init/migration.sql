-- CreateTable
CREATE TABLE "Anchor" (
    "id" TEXT NOT NULL,
    "commitHash" TEXT NOT NULL,
    "gitRemote" TEXT NOT NULL DEFAULT '',
    "branch" TEXT,
    "author" TEXT,
    "authorType" TEXT,
    "message" TEXT,
    "aiPercentage" DOUBLE PRECISION,
    "added" INTEGER NOT NULL DEFAULT 0,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "aiAdded" INTEGER NOT NULL DEFAULT 0,
    "aiDeleted" INTEGER NOT NULL DEFAULT 0,
    "committedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anchor_committedAt_idx" ON "Anchor"("committedAt");

-- CreateIndex
CREATE INDEX "Anchor_authorType_idx" ON "Anchor"("authorType");

-- CreateIndex
CREATE INDEX "Anchor_branch_idx" ON "Anchor"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "Anchor_gitRemote_commitHash_key" ON "Anchor"("gitRemote", "commitHash");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_anchorId_key" ON "Transcript"("anchorId");

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "Anchor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
