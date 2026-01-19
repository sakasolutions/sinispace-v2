#!/bin/bash

# SQL Migration direkt ausführen
# Umgeht Prisma Migrate Berechtigungsprobleme

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env Datei nicht gefunden!${NC}"
    exit 1
fi

# Lade DATABASE_URL aus .env
export $(grep -v '^#' .env | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL nicht in .env gefunden!${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Führe Datenbank-Migration aus...${NC}"
echo ""

# Extrahiere Connection-String Komponenten
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    
    # Setze PGPASSWORD
    export PGPASSWORD="$DB_PASS"
    
    # Führe SQL-Script aus
    echo -e "${YELLOW}📦 Führe SQL-Migration aus...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/add-db-columns.sql
    
    unset PGPASSWORD
    
    echo ""
    echo -e "${GREEN}✅ Migration erfolgreich ausgeführt!${NC}"
    echo ""
    echo -e "${BLUE}📋 Nächste Schritte:${NC}"
    echo -e "   1. Schema aktualisieren (mit neuen Feldern)"
    echo -e "   2. Prisma Client neu generieren: npx prisma generate"
    echo -e "   3. Neu builden: npm run build"
    echo -e "   4. PM2 neu starten: pm2 restart sinispace"
    
else
    echo -e "${RED}❌ Konnte DATABASE_URL nicht parsen!${NC}"
    exit 1
fi
