#!/bin/bash

# Fix-Script für fehlgeschlagene Workspace-Migration
# Führt die Migration manuell aus

echo "🔧 Fixe fehlgeschlagene Workspace-Migration..."

# Lade .env und extrahiere DATABASE_URL
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL nicht gefunden in .env"
    exit 1
fi

echo "📝 Führe SQL-Migration aus..."
echo "🔗 Database: $DATABASE_URL"

# Führe SQL-Script aus
psql "$DATABASE_URL" -f scripts/fix-workspace-migration.sql

if [ $? -eq 0 ]; then
    echo "✅ SQL-Migration erfolgreich"
    
    # Prisma Client neu generieren
    echo "🔄 Generiere Prisma Client neu..."
    npx prisma generate
    
    echo "✅ Fertig! Workspace-System ist jetzt aktiv."
else
    echo "❌ Fehler beim Ausführen der SQL-Migration"
    exit 1
fi
