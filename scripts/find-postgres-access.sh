#!/bin/bash

# Findet heraus, wie man auf Postgres zugreifen kann

set -e

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Suche nach Postgres-Zugriffsmöglichkeiten...${NC}"
echo ""

# Prüfe ob postgres User existiert
if id "postgres" &>/dev/null; then
    echo -e "${GREEN}✅ postgres User existiert${NC}"
else
    echo -e "${RED}❌ postgres User existiert nicht${NC}"
fi

# Prüfe ob sudo funktioniert
if sudo -n true 2>/dev/null; then
    echo -e "${GREEN}✅ sudo funktioniert (ohne Passwort)${NC}"
    SUDO_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  sudo benötigt Passwort${NC}"
    SUDO_AVAILABLE=false
fi

# Prüfe ob wir root sind
if [ "$EUID" -eq 0 ]; then
    echo -e "${GREEN}✅ Du bist root${NC}"
    IS_ROOT=true
else
    echo -e "${YELLOW}⚠️  Du bist nicht root${NC}"
    IS_ROOT=false
fi

# Prüfe Postgres-Version und Konfiguration
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | head -n1)
    echo -e "${GREEN}✅ psql gefunden: ${PSQL_VERSION}${NC}"
else
    echo -e "${RED}❌ psql nicht gefunden${NC}"
fi

# Prüfe pg_hba.conf
PG_HBA_LOCATIONS=(
    "/etc/postgresql/*/main/pg_hba.conf"
    "/var/lib/pgsql/data/pg_hba.conf"
    "/usr/local/pgsql/data/pg_hba.conf"
    "/opt/homebrew/var/postgresql@*/pg_hba.conf"
)

echo ""
echo -e "${BLUE}📋 Mögliche pg_hba.conf Dateien:${NC}"
for pattern in "${PG_HBA_LOCATIONS[@]}"; do
    for file in $pattern 2>/dev/null; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}   ✅ $file${NC}"
            # Zeige relevante Zeilen
            echo -e "${YELLOW}   Relevante Zeilen:${NC}"
            grep -E "^(local|host)" "$file" | head -5 | sed 's/^/      /'
        fi
    done
done

echo ""
echo -e "${BLUE}💡 Lösungsvorschläge:${NC}"
echo ""

if [ "$IS_ROOT" = true ] || [ "$SUDO_AVAILABLE" = true ]; then
    echo -e "${GREEN}1. Versuche als postgres User (ohne Passwort):${NC}"
    echo -e "   ${YELLOW}sudo -u postgres psql${NC}"
    echo ""
    echo -e "${GREEN}2. Oder direkt zur Datenbank:${NC}"
    echo -e "   ${YELLOW}sudo -u postgres psql -d deine_datenbank_name${NC}"
    echo ""
fi

echo -e "${GREEN}3. Postgres-Passwort zurücksetzen (als root/sudo):${NC}"
echo -e "   ${YELLOW}sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'neues_passwort';\"${NC}"
echo ""

echo -e "${GREEN}4. Oder nutze das Admin-Tool (funktioniert über Prisma):${NC}"
echo -e "   ${YELLOW}npm run db:admin${NC}"
echo -e "   ${YELLOW}Dann: http://localhost:3001${NC}"
echo ""

echo -e "${BLUE}📋 Aktuelle Datenbank-Verbindung:${NC}"
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    if [ ! -z "$DATABASE_URL" ]; then
        DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
        if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"
            echo -e "   User: ${DB_USER}"
            echo -e "   Host: ${DB_HOST}"
            echo -e "   Port: ${DB_PORT}"
            echo -e "   Database: ${DB_NAME}"
        fi
    fi
fi
