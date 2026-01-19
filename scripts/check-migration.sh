#!/bin/bash

# Prüft ob Migration bereits ausgeführt wurde

set -e

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Lade DATABASE_URL
export $(grep -v '^#' .env | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL nicht gefunden!${NC}"
    exit 1
fi

# Extrahiere Connection-String
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    
    export PGPASSWORD="$DB_PASS"
    
    echo -e "${YELLOW}🔍 Prüfe Migration-Status...${NC}"
    echo ""
    
    # Prüfe User.isActive
    USER_ISACTIVE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'isActive';" 2>/dev/null | tr -d ' ')
    
    if [ "$USER_ISACTIVE" = "1" ]; then
        echo -e "${GREEN}✅ User.isActive: Vorhanden${NC}"
    else
        echo -e "${RED}❌ User.isActive: FEHLT${NC}"
    fi
    
    # Prüfe Session.ipAddress
    SESSION_IP=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Session' AND column_name = 'ipAddress';" 2>/dev/null | tr -d ' ')
    
    if [ "$SESSION_IP" = "1" ]; then
        echo -e "${GREEN}✅ Session.ipAddress: Vorhanden${NC}"
    else
        echo -e "${RED}❌ Session.ipAddress: FEHLT${NC}"
    fi
    
    # Prüfe Chat.isDeleted
    CHAT_ISDELETED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Chat' AND column_name = 'isDeleted';" 2>/dev/null | tr -d ' ')
    
    if [ "$CHAT_ISDELETED" = "1" ]; then
        echo -e "${GREEN}✅ Chat.isDeleted: Vorhanden${NC}"
    else
        echo -e "${RED}❌ Chat.isDeleted: FEHLT${NC}"
    fi
    
    # Prüfe AdminLog Tabelle
    ADMINLOG=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'AdminLog';" 2>/dev/null | tr -d ' ')
    
    if [ "$ADMINLOG" = "1" ]; then
        echo -e "${GREEN}✅ AdminLog Tabelle: Vorhanden${NC}"
    else
        echo -e "${RED}❌ AdminLog Tabelle: FEHLT${NC}"
    fi
    
    unset PGPASSWORD
    
    echo ""
    if [ "$USER_ISACTIVE" = "1" ] && [ "$SESSION_IP" = "1" ] && [ "$CHAT_ISDELETED" = "1" ]; then
        echo -e "${GREEN}✅ Migration wurde bereits ausgeführt!${NC}"
    else
        echo -e "${YELLOW}⚠️  Migration wurde noch NICHT ausgeführt!${NC}"
        echo -e "${YELLOW}   Führe aus: bash scripts/apply-db-migration.sh${NC}"
    fi
    
else
    echo -e "${RED}❌ Konnte DATABASE_URL nicht parsen!${NC}"
    exit 1
fi
