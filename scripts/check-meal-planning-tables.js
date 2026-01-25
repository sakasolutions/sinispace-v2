const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    // Prüfe ob MealPreferences Tabelle existiert
    const mealPrefsExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'MealPreferences'
      );
    `;
    
    // Prüfe ob WeeklyPlan Tabelle existiert
    const weeklyPlanExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'WeeklyPlan'
      );
    `;
    
    console.log('📊 Tabellen-Status:');
    console.log(`MealPreferences: ${mealPrefsExists[0]?.exists ? '✅ Existiert' : '❌ Fehlt'}`);
    console.log(`WeeklyPlan: ${weeklyPlanExists[0]?.exists ? '✅ Existiert' : '❌ Fehlt'}`);
    
    // Prüfe Spalten
    if (mealPrefsExists[0]?.exists) {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'MealPreferences'
        ORDER BY ordinal_position;
      `;
      console.log('\n📋 MealPreferences Spalten:');
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    if (weeklyPlanExists[0]?.exists) {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'WeeklyPlan'
        ORDER BY ordinal_position;
      `;
      console.log('\n📋 WeeklyPlan Spalten:');
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
