#!/bin/bash

# Datenbank-Restore Script
# Stellt ein PostgreSQL Backup wieder her

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backup-Verzeichnis
BACKUP_DIR="./backups/db"

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

# Prüfe ob Backup-Verzeichnis existiert
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup-Verzeichnis nicht gefunden: ${BACKUP_DIR}${NC}"
    exit 1
fi

# Liste verfügbare Backups
echo -e "${BLUE}📋 Verfügbare Backups:${NC}"
BACKUPS=($(ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -10))
if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}❌ Keine Backups gefunden!${NC}"
    exit 1
fi

for i in "${!BACKUPS[@]}"; do
    BACKUP_FILE="${BACKUPS[$i]}"
    BACKUP_NAME=$(basename "$BACKUP_FILE")
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE" 2>/dev/null || stat -c "%y" "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
    echo -e "   [$i] ${BACKUP_NAME} (${BACKUP_SIZE}) - ${BACKUP_DATE}"
done

# Frage nach Backup
echo ""
read -p "Welches Backup wiederherstellen? (Nummer oder 'latest'): " SELECTION

if [ "$SELECTION" = "latest" ]; then
    BACKUP_FILE="${BACKUP_DIR}/latest.sql.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ latest.sql.gz nicht gefunden!${NC}"
        exit 1
    fi
    # Resolve symlink
    BACKUP_FILE=$(readlink -f "$BACKUP_FILE" 2>/dev/null || echo "$BACKUP_FILE")
elif [[ "$SELECTION" =~ ^[0-9]+$ ]] && [ "$SELECTION" -lt "${#BACKUPS[@]}" ]; then
    BACKUP_FILE="${BACKUPS[$SELECTION]}"
else
    echo -e "${RED}❌ Ungültige Auswahl!${NC}"
    exit 1
fi

# Warnung
echo ""
echo -e "${RED}⚠️  WARNUNG: Dies wird die komplette Datenbank überschreiben!${NC}"
echo -e "${YELLOW}   Backup: $(basename "$BACKUP_FILE")${NC}"
read -p "Fortfahren? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Abgebrochen.${NC}"
    exit 0
fi

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
    
    echo -e "${YELLOW}📦 Stelle Datenbank wieder her...${NC}"
    
    # Dekomprimiere und restore
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
    
    unset PGPASSWORD
    
    echo -e "${GREEN}✅ Datenbank erfolgreich wiederhergestellt!${NC}"
    echo -e "   Backup: $(basename "$BACKUP_FILE")"
    
else
    echo -e "${RED}❌ Konnte DATABASE_URL nicht parsen!${NC}"
    exit 1
fi
