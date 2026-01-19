#!/bin/bash

# Versucht, volle Datenbank-Rechte zu vergeben
# WICHTIG: Benötigt Superuser-Zugriff (postgres User)

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
    
    echo -e "${BLUE}🔐 Versuche, Rechte für User ${DB_USER} zu erhöhen...${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  WICHTIG: Dieses Script benötigt Superuser-Zugriff!${NC}"
    echo -e "${YELLOW}   Falls es fehlschlägt, musst du manuell als postgres User einloggen.${NC}"
    echo ""
    
    read -p "Postgres Superuser Passwort (leer lassen wenn nicht nötig): " POSTGRES_PASS
    
    export PGPASSWORD="$POSTGRES_PASS"
    
    # Versuche als postgres User zu verbinden
    if [ -z "$POSTGRES_PASS" ]; then
        # Versuche ohne Passwort (lokale Verbindung)
        PSQL_USER="postgres"
    else
        PSQL_USER="postgres"
    fi
    
    echo -e "${BLUE}📋 Führe GRANT-Befehle aus...${NC}"
    
    # Rechte auf alle Tabellen vergeben
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$PSQL_USER" -d "$DB_NAME" <<EOF 2>/dev/null || {
        echo -e "${RED}❌ Fehler beim Vergeben der Rechte!${NC}"
        echo -e "${YELLOW}   Versuche es manuell als postgres User:${NC}"
        echo -e "${YELLOW}   psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME${NC}"
        echo -e "${YELLOW}   Dann führe aus:${NC}"
        echo -e "${YELLOW}   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"$DB_USER\";${NC}"
        echo -e "${YELLOW}   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"$DB_USER\";${NC}"
        echo -e "${YELLOW}   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"$DB_USER\";${NC}"
        unset PGPASSWORD
        exit 1
    }
-- Rechte auf alle bestehenden Tabellen
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$DB_USER";

-- Rechte auf alle Sequenzen (für AUTO_INCREMENT)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "$DB_USER";

-- Rechte für zukünftige Tabellen
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "$DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "$DB_USER";

-- Optional: Superuser-Rechte (NUR wenn wirklich nötig!)
-- ALTER USER "$DB_USER" WITH SUPERUSER;
EOF
    
    unset PGPASSWORD
    
    echo ""
    echo -e "${GREEN}✅ Rechte erfolgreich vergeben!${NC}"
    echo ""
    echo -e "${BLUE}📋 Prüfe jetzt die Rechte:${NC}"
    echo -e "${BLUE}   bash scripts/check-db-permissions.sh${NC}"
    
else
    echo -e "${RED}❌ Konnte DATABASE_URL nicht parsen!${NC}"
    exit 1
fi
