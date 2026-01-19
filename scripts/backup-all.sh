#!/bin/bash

# Komplettes Backup Script
# Erstellt sowohl Code- als auch Datenbank-Backup

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starte komplettes Backup...${NC}"
echo ""

# Code-Backup
echo -e "${YELLOW}1️⃣  Code-Backup...${NC}"
bash ./scripts/backup-code.sh

echo ""
echo -e "${YELLOW}2️⃣  Datenbank-Backup...${NC}"
bash ./scripts/backup-db.sh

echo ""
echo -e "${GREEN}✅ Komplettes Backup erfolgreich!${NC}"
echo ""
echo -e "${BLUE}📋 Backup-Übersicht:${NC}"
echo -e "   Code: Git Tag erstellt"
echo -e "   Datenbank: SQL Dump erstellt"
echo ""
echo -e "${YELLOW}💡 Zum Wiederherstellen:${NC}"
echo -e "   Code: bash ./scripts/restore-code.sh"
echo -e "   DB: bash ./scripts/restore-db.sh"
