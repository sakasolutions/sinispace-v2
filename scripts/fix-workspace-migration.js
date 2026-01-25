const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMigration() {
  console.log('🔧 Fixe fehlgeschlagene Workspace-Migration...\n');

  try {
    // Prüfe ob Workspace-Tabelle existiert
    console.log('📋 Prüfe ob Workspace-Tabelle existiert...');
    const workspaceExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Workspace'
      );
    `);

    if (!workspaceExists[0].exists) {
      console.log('📝 Erstelle Workspace-Tabelle...');
      await prisma.$executeRawUnsafe(`
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
      `);
      console.log('✅ Workspace-Tabelle erstellt');
    } else {
      console.log('✅ Workspace-Tabelle existiert bereits');
    }

    // Prüfe ob Result-Tabelle existiert
    console.log('📋 Prüfe ob Result-Tabelle existiert...');
    const resultExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Result'
      );
    `);

    if (!resultExists[0].exists) {
      console.log('📝 Erstelle Result-Tabelle...');
      await prisma.$executeRawUnsafe(`
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
      `);
      console.log('✅ Result-Tabelle erstellt');
    } else {
      console.log('✅ Result-Tabelle existiert bereits');
    }

    // Prüfe ob Chat.workspaceId Spalte existiert
    console.log('📋 Prüfe ob Chat.workspaceId Spalte existiert...');
    const columnExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Chat' 
        AND column_name = 'workspaceId'
      );
    `);

    if (!columnExists[0].exists) {
      console.log('📝 Füge workspaceId zu Chat hinzu...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Chat" ADD COLUMN "workspaceId" TEXT;
      `);
      console.log('✅ workspaceId Spalte hinzugefügt');
    } else {
      console.log('✅ workspaceId Spalte existiert bereits');
    }

    // Erstelle Indizes
    console.log('📝 Erstelle Indizes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Workspace_userId_isArchived_idx" ON "Workspace"("userId", "isArchived");
      CREATE INDEX IF NOT EXISTS "Workspace_userId_createdAt_idx" ON "Workspace"("userId", "createdAt");
      CREATE INDEX IF NOT EXISTS "Result_userId_createdAt_idx" ON "Result"("userId", "createdAt");
      CREATE INDEX IF NOT EXISTS "Result_workspaceId_createdAt_idx" ON "Result"("workspaceId", "createdAt");
      CREATE INDEX IF NOT EXISTS "Result_toolId_createdAt_idx" ON "Result"("toolId", "createdAt");
      CREATE INDEX IF NOT EXISTS "Result_createdAt_idx" ON "Result"("createdAt");
      CREATE INDEX IF NOT EXISTS "Chat_workspaceId_idx" ON "Chat"("workspaceId");
    `);
    console.log('✅ Indizes erstellt');

    // Erstelle Foreign Keys
    console.log('📝 Erstelle Foreign Keys...');
    
    // Workspace -> User
    const fk1 = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'Workspace_userId_fkey'
      );
    `);
    if (!fk1[0].exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log('✅ Workspace -> User Foreign Key erstellt');
    }

    // Result -> User
    const fk2 = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'Result_userId_fkey'
      );
    `);
    if (!fk2[0].exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Result" ADD CONSTRAINT "Result_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log('✅ Result -> User Foreign Key erstellt');
    }

    // Result -> Workspace
    const fk3 = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'Result_workspaceId_fkey'
      );
    `);
    if (!fk3[0].exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Result" ADD CONSTRAINT "Result_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log('✅ Result -> Workspace Foreign Key erstellt');
    }

    // Chat -> Workspace
    const fk4 = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'Chat_workspaceId_fkey'
      );
    `);
    if (!fk4[0].exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Chat" ADD CONSTRAINT "Chat_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log('✅ Chat -> Workspace Foreign Key erstellt');
    }

    console.log('\n✅ Migration erfolgreich repariert!');
    console.log('🔄 Generiere Prisma Client neu...');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixMigration();
