-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "toolId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workspace_userId_isArchived_idx" ON "Workspace"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "Workspace_userId_createdAt_idx" ON "Workspace"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Result_userId_createdAt_idx" ON "Result"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Result_workspaceId_createdAt_idx" ON "Result"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Result_toolId_createdAt_idx" ON "Result"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "Result_createdAt_idx" ON "Result"("createdAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddColumn to Chat (workspaceId) - MUSS VOR Foreign Key kommen!
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- CreateIndex for Chat workspaceId
CREATE INDEX IF NOT EXISTS "Chat_workspaceId_idx" ON "Chat"("workspaceId");

-- AddForeignKey für Chat - NACH der Spalte!
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
