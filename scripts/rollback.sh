#!/bin/bash

# Rollback Script
# Stellt Code von einem früheren Commit wieder her

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⏪ Rollback-Workflow${NC}"
echo ""

# Zeige letzte Commits
echo -e "${YELLOW}📋 Letzte Commits:${NC}"
git log --oneline -15

echo ""
read -p "Zu welchem Commit zurückkehren? (Hash oder 'main' für neuesten): " COMMIT_HASH

if [ -z "$COMMIT_HASH" ]; then
    echo -e "${RED}❌ Kein Commit angegeben!${NC}"
    exit 1
fi

# Prüfe ob Commit existiert
if [ "$COMMIT_HASH" != "main" ] && ! git rev-parse "$COMMIT_HASH" >/dev/null 2>&1; then
    echo -e "${RED}❌ Commit nicht gefunden: ${COMMIT_HASH}${NC}"
    exit 1
fi

# Zeige Info
if [ "$COMMIT_HASH" = "main" ]; then
    COMMIT_INFO=$(git log -1 --pretty=format:"%h - %s (%ar)" main)
    echo -e "${BLUE}📋 Ziel: main (${COMMIT_INFO})${NC}"
else
    COMMIT_INFO=$(git log -1 --pretty=format:"%h - %s (%ar)" "$COMMIT_HASH")
    echo -e "${BLUE}📋 Ziel: ${COMMIT_HASH} (${COMMIT_INFO})${NC}"
fi

# Warnung
echo ""
echo -e "${RED}⚠️  WARNUNG: Dies wird deinen aktuellen Code überschreiben!${NC}"
read -p "Fortfahren? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Abgebrochen.${NC}"
    exit 0
fi

# Prüfe auf uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted Changes gefunden!${NC}"
    read -p "Diese verwerfen? (yes/no): " DISCARD
    
    if [ "$DISCARD" = "yes" ]; then
        git reset --hard HEAD
        git clean -fd
    else
        echo -e "${YELLOW}   Stash uncommitted changes...${NC}"
        git stash push -m "Stash vor Rollback: $(date +"%Y-%m-%d %H:%M:%S")"
    fi
fi

# Checkout
echo ""
echo -e "${YELLOW}⏪ Stelle Code wieder her...${NC}"

if [ "$COMMIT_HASH" = "main" ]; then
    git checkout main
    git pull origin main
else
    git checkout "$COMMIT_HASH"
fi

echo ""
echo -e "${GREEN}✅ Code wiederhergestellt!${NC}"
echo ""
echo -e "${BLUE}📋 Server-Build-Befehle:${NC}"
echo -e "${YELLOW}   Kopiere diese Befehle und führe sie auf dem Server aus:${NC}"
echo ""
echo "cd /var/www/sinispace-v2"
echo "git checkout ${COMMIT_HASH}"
echo "npm install"
echo "npx prisma generate"
echo "rm -rf .next"
echo "npm run build"
echo "pm2 restart sinispace"
echo ""
echo -e "${BLUE}📋 Oder als ein Befehl:${NC}"
echo "cd /var/www/sinispace-v2 && git checkout ${COMMIT_HASH} && npm install && npx prisma generate && rm -rf .next && npm run build && pm2 restart sinispace"
echo ""
echo -e "${YELLOW}💡 Zurück zum neuesten Stand:${NC}"
echo "git checkout main && git pull origin main"
