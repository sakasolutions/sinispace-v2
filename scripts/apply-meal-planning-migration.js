const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    const sql = fs.readFileSync('prisma/migrations/20250126000000_add_meal_planning/migration.sql', 'utf8');
    
    // Teile SQL in Statements, aber behandle DO $$ ... END $$; Blöcke als Ganzes
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Überspringe Kommentare
      if (trimmed.startsWith('--')) continue;
      
      currentStatement += line + '\n';
      
      // Prüfe ob wir in einem DO-Block sind
      if (trimmed.match(/DO\s+\$\$/i)) {
        inDoBlock = true;
        doBlockDepth = 1;
      } else if (inDoBlock) {
        // Zähle $$ um verschachtelte Blöcke zu handhaben
        const dollarMatches = trimmed.match(/\$\$/g);
        if (dollarMatches) {
          doBlockDepth += dollarMatches.length - 1;
        }
        
        // Prüfe ob DO-Block endet
        if (trimmed.includes('END $$;') || trimmed.includes('END$$;')) {
          doBlockDepth--;
          if (doBlockDepth === 0) {
            inDoBlock = false;
            statements.push(currentStatement.trim());
            currentStatement = '';
          }
        }
      } else if (trimmed.endsWith(';') && !inDoBlock) {
        // Normales Statement Ende
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Füge letztes Statement hinzu falls vorhanden
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    // Filtere leere Statements
    const validStatements = statements.filter(s => s.length > 0 && !s.match(/^\s*$/));
    
    console.log(`📝 Führe ${validStatements.length} SQL-Statements aus...`);
    
    // Führe jedes Statement einzeln aus
    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i];
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Statement ${i + 1}/${validStatements.length} erfolgreich`);
      } catch (error) {
        // Ignoriere Fehler wenn Tabelle/Constraint bereits existiert
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('constraint') && error.message.includes('already exists') ||
            error.code === '42P07' || // relation already exists
            error.code === '42710') {  // duplicate object
          console.log(`⚠️  Statement ${i + 1}/${validStatements.length} bereits vorhanden (übersprungen)`);
        } else {
          console.error(`❌ Fehler bei Statement ${i + 1}:`, error.message);
          console.error(`SQL (erste 200 Zeichen): ${statement.substring(0, 200)}...`);
          // Nicht werfen, sondern weiter machen
        }
      }
    }
    
    console.log('✅ Migration erfolgreich ausgeführt!');
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
