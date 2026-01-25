#!/bin/bash

# Einfaches Fix-Script für den Server
# Kann direkt auf dem Server erstellt und ausgeführt werden

echo "🔧 Fixe Workspace-Migration..."

# Lade DATABASE_URL aus .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL nicht gefunden"
    exit 1
fi

# Extrahiere Verbindungsdaten aus DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL="$DATABASE_URL"

echo "📝 Führe SQL-Migration aus..."

# Führe SQL direkt aus (ohne Datei)
psql "$DB_URL" << 'EOF'
-- Erstelle Workspace-Tabelle
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

-- Erstelle Result-Tabelle
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

-- Füge workspaceId zu Chat hinzu
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Erstelle Indizes
CREATE INDEX IF NOT EXISTS "Workspace_userId_isArchived_idx" ON "Workspace"("userId", "isArchived");
CREATE INDEX IF NOT EXISTS "Workspace_userId_createdAt_idx" ON "Workspace"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Result_userId_createdAt_idx" ON "Result"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Result_workspaceId_createdAt_idx" ON "Result"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "Result_toolId_createdAt_idx" ON "Result"("toolId", "createdAt");
CREATE INDEX IF NOT EXISTS "Result_createdAt_idx" ON "Result"("createdAt");
CREATE INDEX IF NOT EXISTS "Chat_workspaceId_idx" ON "Chat"("workspaceId");

-- Erstelle Foreign Keys
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Workspace_userId_fkey') THEN
        ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Result_userId_fkey') THEN
        ALTER TABLE "Result" ADD CONSTRAINT "Result_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Result_workspaceId_fkey') THEN
        ALTER TABLE "Result" ADD CONSTRAINT "Result_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Chat' AND column_name = 'workspaceId') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Chat_workspaceId_fkey') THEN
            ALTER TABLE "Chat" ADD CONSTRAINT "Chat_workspaceId_fkey" 
            FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
EOF

if [ $? -eq 0 ]; then
    echo "✅ SQL-Migration erfolgreich"
    echo "🔄 Generiere Prisma Client neu..."
    npx prisma generate
    echo "✅ Fertig!"
else
    echo "❌ Fehler beim Ausführen der SQL-Migration"
    exit 1
fi
