const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Teste Datenbank-Verbindung...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Gesetzt' : '❌ NICHT gesetzt');
    
    // Test 1: Einfache Query
    const userCount = await prisma.user.count();
    console.log(`✅ Datenbank verbunden! Anzahl User: ${userCount}`);
    
    // Test 2: Prüfe ob lastLoginAt Spalte existiert
    try {
      const testUser = await prisma.user.findFirst({
        select: {
          id: true,
          email: true,
          lastLoginAt: true,
        },
      });
      console.log('✅ lastLoginAt Spalte existiert in der Datenbank');
      if (testUser) {
        console.log(`   Test-User: ${testUser.email}, lastLoginAt: ${testUser.lastLoginAt || 'null'}`);
      }
    } catch (error) {
      console.error('❌ FEHLER: lastLoginAt Spalte existiert NICHT in der Datenbank!');
      console.error('   Fehler:', error.message);
      console.error('   Lösung: Migration ausführen oder Spalte manuell hinzufügen');
    }
    
    // Test 3: Prüfe Sessions
    const sessionCount = await prisma.session.count();
    console.log(`✅ Sessions-Tabelle funktioniert! Anzahl Sessions: ${sessionCount}`);
    
    // Test 4: Versuche einen User zu finden
    const users = await prisma.user.findMany({
      take: 3,
      select: {
        id: true,
        email: true,
        password: true,
      },
    });
    console.log(`✅ User-Query funktioniert! Gefundene User: ${users.length}`);
    if (users.length > 0) {
      console.log(`   Erster User: ${users[0].email} (hat Passwort: ${users[0].password ? 'ja' : 'nein'})`);
    }
    
    await prisma.$disconnect();
    console.log('\n✅ Alle Tests erfolgreich! Datenbank funktioniert.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FEHLER bei Datenbank-Test:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

testDatabase();
