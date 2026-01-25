-- Fix für fehlgeschlagene Workspace-Migration
-- Führt die Migration manuell in der richtigen Reihenfolge aus

-- 1. Erstelle Workspace-Tabelle (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS "Workspace" (
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

-- 2. Erstelle Result-Tabelle (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS "Result" (
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

-- 3. Füge workspaceId zu Chat hinzu (WICHTIG: VOR Foreign Key!)
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- 4. Erstelle Indizes (falls nicht vorhanden)
CREATE INDEX IF NOT EXISTS "Workspace_userId_isArchived_idx" ON "Workspace"("userId", "isArchived");
CREATE INDEX IF NOT EXISTS "Workspace_userId_createdAt_idx" ON "Workspace"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Result_userId_createdAt_idx" ON "Result"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Result_workspaceId_createdAt_idx" ON "Result"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "Result_toolId_createdAt_idx" ON "Result"("toolId", "createdAt");
CREATE INDEX IF NOT EXISTS "Result_createdAt_idx" ON "Result"("createdAt");
CREATE INDEX IF NOT EXISTS "Chat_workspaceId_idx" ON "Chat"("workspaceId");

-- 5. Erstelle Foreign Keys (NACH den Spalten!)
DO $$ 
BEGIN
    -- Workspace -> User
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Workspace_userId_fkey'
    ) THEN
        ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Result -> User
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Result_userId_fkey'
    ) THEN
        ALTER TABLE "Result" ADD CONSTRAINT "Result_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Result -> Workspace
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Result_workspaceId_fkey'
    ) THEN
        ALTER TABLE "Result" ADD CONSTRAINT "Result_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Chat -> Workspace (NUR wenn Spalte existiert!)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Chat' AND column_name = 'workspaceId'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Chat_workspaceId_fkey'
        ) THEN
            ALTER TABLE "Chat" ADD CONSTRAINT "Chat_workspaceId_fkey" 
            FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
