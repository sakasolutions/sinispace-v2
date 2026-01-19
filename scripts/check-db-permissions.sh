#!/bin/bash

# Prüft Datenbank-Berechtigungen des aktuellen Users

set -e

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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
    
    echo -e "${BLUE}🔍 Prüfe Datenbank-Berechtigungen für User: ${DB_USER}${NC}"
    echo ""
    
    # Aktueller User
    CURRENT_USER=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT current_user;" 2>/dev/null | tr -d ' ')
    echo -e "${BLUE}👤 Aktueller User: ${CURRENT_USER}${NC}"
    echo ""
    
    # Prüfe ob User Superuser ist
    IS_SUPERUSER=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT usesuper FROM pg_user WHERE usename = current_user;" 2>/dev/null | tr -d ' ')
    
    if [ "$IS_SUPERUSER" = "t" ]; then
        echo -e "${GREEN}✅ User ist SUPERUSER - Volle Kontrolle!${NC}"
    else
        echo -e "${YELLOW}⚠️  User ist KEIN Superuser${NC}"
    fi
    echo ""
    
    # Prüfe CREATE Rechte
    CAN_CREATE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT has_database_privilege(current_user, '$DB_NAME', 'CREATE');" 2>/dev/null | tr -d ' ')
    
    if [ "$CAN_CREATE" = "t" ]; then
        echo -e "${GREEN}✅ CREATE Rechte: Vorhanden${NC}"
    else
        echo -e "${RED}❌ CREATE Rechte: FEHLT${NC}"
    fi
    
    # Prüfe ALTER Rechte auf User Tabelle
    CAN_ALTER_USER=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT has_table_privilege(current_user, '\"User\"', 'ALTER');" 2>/dev/null | tr -d ' ')
    
    if [ "$CAN_ALTER_USER" = "t" ]; then
        echo -e "${GREEN}✅ ALTER Rechte auf User: Vorhanden${NC}"
    else
        echo -e "${RED}❌ ALTER Rechte auf User: FEHLT${NC}"
    fi
    
    # Prüfe INSERT/UPDATE/DELETE Rechte
    CAN_INSERT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT has_table_privilege(current_user, '\"User\"', 'INSERT');" 2>/dev/null | tr -d ' ')
    
    if [ "$CAN_INSERT" = "t" ]; then
        echo -e "${GREEN}✅ INSERT Rechte: Vorhanden${NC}"
    else
        echo -e "${RED}❌ INSERT Rechte: FEHLT${NC}"
    fi
    
    CAN_UPDATE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT has_table_privilege(current_user, '\"User\"', 'UPDATE');" 2>/dev/null | tr -d ' ')
    
    if [ "$CAN_UPDATE" = "t" ]; then
        echo -e "${GREEN}✅ UPDATE Rechte: Vorhanden${NC}"
    else
        echo -e "${RED}❌ UPDATE Rechte: FEHLT${NC}"
    fi
    
    CAN_DELETE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT has_table_privilege(current_user, '\"User\"', 'DELETE');" 2>/dev/null | tr -d ' ')
    
    if [ "$CAN_DELETE" = "t" ]; then
        echo -e "${GREEN}✅ DELETE Rechte: Vorhanden${NC}"
    else
        echo -e "${RED}❌ DELETE Rechte: FEHLT${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Tabellen-Besitzer:${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null
    
    unset PGPASSWORD
    
    echo ""
    if [ "$IS_SUPERUSER" = "t" ]; then
        echo -e "${GREEN}✅ Du hast volle Kontrolle über die Datenbank!${NC}"
    else
        echo -e "${YELLOW}⚠️  Du hast eingeschränkte Rechte.${NC}"
        echo -e "${YELLOW}   Um volle Kontrolle zu bekommen, musst du:${NC}"
        echo -e "${YELLOW}   1. Als Superuser einloggen (postgres User)${NC}"
        echo -e "${YELLOW}   2. Rechte vergeben: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"$DB_USER\";${NC}"
        echo -e "${YELLOW}   3. Oder: ALTER USER \"$DB_USER\" WITH SUPERUSER;${NC}"
    fi
    
else
    echo -e "${RED}❌ Konnte DATABASE_URL nicht parsen!${NC}"
    exit 1
fi
