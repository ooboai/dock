-- CreateTable
CREATE TABLE "SessionTranscript" (
    "id" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "parentSessionId" TEXT,
    "subagentType" TEXT,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique constraint — one transcript per session per anchor; also covers anchorId-only lookups)
CREATE UNIQUE INDEX "SessionTranscript_anchorId_sessionId_key" ON "SessionTranscript"("anchorId", "sessionId");

-- CreateIndex
CREATE INDEX "SessionTranscript_sessionId_idx" ON "SessionTranscript"("sessionId");

-- AddForeignKey
ALTER TABLE "SessionTranscript" ADD CONSTRAINT "SessionTranscript_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "Anchor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
