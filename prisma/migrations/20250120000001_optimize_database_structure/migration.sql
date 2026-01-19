-- Optimize Database Structure
-- Fügt neue Felder hinzu, ohne bestehende Daten zu löschen
-- WICHTIG: subscriptionEnd, Login, Logout, Premium bleiben unverändert!

-- User: Admin-Features hinzufügen
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Session: Security & Admin-Features hinzufügen
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Indizes für Session
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expires_idx" ON "Session"("expires");

-- Chat: Expiry & Management hinzufügen
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Indizes für Chat
CREATE INDEX IF NOT EXISTS "Chat_userId_idx" ON "Chat"("userId");
CREATE INDEX IF NOT EXISTS "Chat_expiresAt_idx" ON "Chat"("expiresAt");
CREATE INDEX IF NOT EXISTS "Chat_isDeleted_idx" ON "Chat"("isDeleted");

-- Message: Analytics hinzufügen
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "tokenCount" INTEGER;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "modelUsed" TEXT;

-- Index für Message
CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");

-- Document: Management hinzufügen
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Index für Document
CREATE INDEX IF NOT EXISTS "Document_isDeleted_idx" ON "Document"("isDeleted");

-- AdminLog: Neue Tabelle für Admin-Logging
CREATE TABLE IF NOT EXISTS "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- Indizes für AdminLog
CREATE INDEX IF NOT EXISTS "AdminLog_adminId_idx" ON "AdminLog"("adminId");
CREATE INDEX IF NOT EXISTS "AdminLog_targetType_targetId_idx" ON "AdminLog"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");
