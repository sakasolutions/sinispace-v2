-- SQL Script zum direkten Ausführen in der Datenbank
-- Fügt neue Spalten hinzu, ohne Prisma Migrate zu verwenden
-- WICHTIG: subscriptionEnd, Login, Logout, Premium bleiben unverändert!

-- Prüfe ob Spalten existieren, bevor sie hinzugefügt werden
DO $$ 
BEGIN
    -- User: Admin-Features hinzufügen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'isActive') THEN
        ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Spalte User.isActive hinzugefügt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'notes') THEN
        ALTER TABLE "User" ADD COLUMN "notes" TEXT;
        RAISE NOTICE 'Spalte User.notes hinzugefügt';
    END IF;

    -- Session: Security & Admin-Features hinzufügen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Session' AND column_name = 'ipAddress') THEN
        ALTER TABLE "Session" ADD COLUMN "ipAddress" TEXT;
        RAISE NOTICE 'Spalte Session.ipAddress hinzugefügt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Session' AND column_name = 'userAgent') THEN
        ALTER TABLE "Session" ADD COLUMN "userAgent" TEXT;
        RAISE NOTICE 'Spalte Session.userAgent hinzugefügt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Session' AND column_name = 'isActive') THEN
        ALTER TABLE "Session" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Spalte Session.isActive hinzugefügt';
    END IF;

    -- Chat: Expiry & Management hinzufügen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Chat' AND column_name = 'expiresAt') THEN
        ALTER TABLE "Chat" ADD COLUMN "expiresAt" TIMESTAMP(3);
        RAISE NOTICE 'Spalte Chat.expiresAt hinzugefügt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Chat' AND column_name = 'isArchived') THEN
        ALTER TABLE "Chat" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Spalte Chat.isArchived hinzugefügt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Chat' AND column_name = 'isDeleted') THEN
        ALTER TABLE "Chat" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Spalte Chat.isDeleted hinzugefügt';
    END IF;

    -- Message: Analytics hinzufügen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'tokenCount') THEN
        ALTER TABLE "Message" ADD COLUMN "tokenCount" INTEGER;
        RAISE NOTICE 'Spalte Message.tokenCount hinzugefügt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'modelUsed') THEN
        ALTER TABLE "Message" ADD COLUMN "modelUsed" TEXT;
        RAISE NOTICE 'Spalte Message.modelUsed hinzugefügt';
    END IF;

    -- Document: Management hinzufügen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Document' AND column_name = 'isDeleted') THEN
        ALTER TABLE "Document" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Spalte Document.isDeleted hinzugefügt';
    END IF;
END $$;

-- Indizes für Session
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Session_userId_idx') THEN
        CREATE INDEX "Session_userId_idx" ON "Session"("userId");
        RAISE NOTICE 'Index Session_userId_idx erstellt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Session_expires_idx') THEN
        CREATE INDEX "Session_expires_idx" ON "Session"("expires");
        RAISE NOTICE 'Index Session_expires_idx erstellt';
    END IF;
END $$;

-- Indizes für Chat
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Chat_userId_idx') THEN
        CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");
        RAISE NOTICE 'Index Chat_userId_idx erstellt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Chat_expiresAt_idx') THEN
        CREATE INDEX "Chat_expiresAt_idx" ON "Chat"("expiresAt");
        RAISE NOTICE 'Index Chat_expiresAt_idx erstellt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Chat_isDeleted_idx') THEN
        CREATE INDEX "Chat_isDeleted_idx" ON "Chat"("isDeleted");
        RAISE NOTICE 'Index Chat_isDeleted_idx erstellt';
    END IF;
END $$;

-- Index für Message
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Message_createdAt_idx') THEN
        CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
        RAISE NOTICE 'Index Message_createdAt_idx erstellt';
    END IF;
END $$;

-- Index für Document
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Document_isDeleted_idx') THEN
        CREATE INDEX "Document_isDeleted_idx" ON "Document"("isDeleted");
        RAISE NOTICE 'Index Document_isDeleted_idx erstellt';
    END IF;
END $$;

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
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminLog_adminId_idx') THEN
        CREATE INDEX "AdminLog_adminId_idx" ON "AdminLog"("adminId");
        RAISE NOTICE 'Index AdminLog_adminId_idx erstellt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminLog_targetType_targetId_idx') THEN
        CREATE INDEX "AdminLog_targetType_targetId_idx" ON "AdminLog"("targetType", "targetId");
        RAISE NOTICE 'Index AdminLog_targetType_targetId_idx erstellt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminLog_createdAt_idx') THEN
        CREATE INDEX "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");
        RAISE NOTICE 'Index AdminLog_createdAt_idx erstellt';
    END IF;
END $$;

SELECT 'Migration erfolgreich abgeschlossen!' as status;
