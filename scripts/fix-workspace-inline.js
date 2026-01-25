// Einfaches Inline-Script - kann direkt auf dem Server erstellt werden
// Erstelle diese Datei mit: cat > fix-workspace.js << 'EOF' ... EOF

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    console.log('🔧 Erstelle Workspace-Tabelle...');
    await prisma.$executeRawUnsafe(`
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
    `);

    console.log('🔧 Erstelle Result-Tabelle...');
    await prisma.$executeRawUnsafe(`
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
    `);

    console.log('🔧 Füge workspaceId zu Chat hinzu...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
    `);

    console.log('🔧 Erstelle Indizes...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Workspace_userId_isArchived_idx" ON "Workspace"("userId", "isArchived");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Workspace_userId_createdAt_idx" ON "Workspace"("userId", "createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Result_userId_createdAt_idx" ON "Result"("userId", "createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Result_workspaceId_createdAt_idx" ON "Result"("workspaceId", "createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Result_toolId_createdAt_idx" ON "Result"("toolId", "createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Result_createdAt_idx" ON "Result"("createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Chat_workspaceId_idx" ON "Chat"("workspaceId");`);

    console.log('🔧 Erstelle Foreign Keys...');
    
    const fk1 = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Workspace_userId_fkey') as exists;
    `);
    if (!fk1[0].exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    }

    const fk2 = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Result_userId_fkey') as exists;
    `);
    if (!fk2[0].exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Result" ADD CONSTRAINT "Result_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    }

    const fk3 = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Result_workspaceId_fkey') as exists;
    `);
    if (!fk3[0].exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Result" ADD CONSTRAINT "Result_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `);
    }

    const columnExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Chat' AND column_name = 'workspaceId'
      ) as exists;
    `);
    
    if (columnExists[0].exists) {
      const fk4 = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Chat_workspaceId_fkey') as exists;
      `);
      if (!fk4[0].exists) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Chat" ADD CONSTRAINT "Chat_workspaceId_fkey" 
          FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
      }
    }

    console.log('✅ Migration erfolgreich repariert!');
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
