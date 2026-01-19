#!/bin/bash

# Datenbank-Backup Script
# Erstellt ein PostgreSQL Dump der kompletten Datenbank

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Backup-Verzeichnis
BACKUP_DIR="./backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

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

# Erstelle Backup-Verzeichnis falls nicht vorhanden
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Erstelle Datenbank-Backup...${NC}"
echo -e "   Ziel: ${BACKUP_FILE}"

# PostgreSQL Dump erstellen
# Extrahiere Connection-String Komponenten
# Format: postgresql://user:password@host:port/database
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    
    # Setze PGPASSWORD für pg_dump
    export PGPASSWORD="$DB_PASS"
    
    # Erstelle Dump
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl --clean --if-exists \
        -f "$BACKUP_FILE"
    
    unset PGPASSWORD
    
    # Komprimiere Backup
    echo -e "${YELLOW}🗜️  Komprimiere Backup...${NC}"
    gzip -f "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # Backup-Größe anzeigen
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo -e "${GREEN}✅ Backup erfolgreich erstellt!${NC}"
    echo -e "   Datei: ${BACKUP_FILE}"
    echo -e "   Größe: ${BACKUP_SIZE}"
    echo -e "   Zeitstempel: ${TIMESTAMP}"
    
    # Erstelle Symlink zum neuesten Backup
    LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"
    ln -sf "$(basename "$BACKUP_FILE")" "$LATEST_LINK"
    echo -e "   → Neuestes Backup: ${LATEST_LINK}"
    
else
    echo -e "${RED}❌ Konnte DATABASE_URL nicht parsen!${NC}"
    exit 1
fi
