#!/bin/bash

# Script zum Ausführen der Meal-Planning Migration
# Löst das Problem mit psql und DATABASE_URL Schema-Parameter

cd /var/www/sinispace-v2

# Lade DATABASE_URL
source .env 2>/dev/null || export $(grep DATABASE_URL .env | xargs)

# Parse DATABASE_URL und entferne Schema-Parameter für psql
# Format: postgresql://user:pass@host:port/db?schema=public
DB_URL=$(echo "$DATABASE_URL" | sed 's/?schema=[^&]*//' | sed 's/&schema=[^&]*//')

# Extrahiere Verbindungsdetails
# postgresql://user:pass@host:port/db
if [[ "$DB_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    
    # Setze PGPASSWORD für psql
    export PGPASSWORD="$DB_PASS"
    
    # Führe Migration aus
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f prisma/migrations/20250126000000_add_meal_planning/migration.sql
    
    echo "✅ Migration erfolgreich ausgeführt!"
else
    echo "❌ Fehler: Konnte DATABASE_URL nicht parsen"
    echo "DATABASE_URL Format: postgresql://user:pass@host:port/db"
    exit 1
fi
