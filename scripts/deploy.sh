#!/bin/bash

# Deployment Script
# Automatisiert: Backup → Commit → Push → Server-Build-Befehle

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deployment-Workflow${NC}"
echo ""

# 1. BACKUP
echo -e "${YELLOW}1️⃣  Backup erstellen...${NC}"
bash ./scripts/backup-before-change.sh

echo ""

# 2. Prüfe auf Änderungen
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ Keine Änderungen zum committen${NC}"
    echo ""
    echo -e "${BLUE}📋 Server-Build-Befehle:${NC}"
    echo -e "${YELLOW}   Kopiere diese Befehle und führe sie auf dem Server aus:${NC}"
    echo ""
    echo "cd /var/www/sinispace-v2"
    echo "git pull origin main"
    echo "npm install"
    echo "npx prisma generate"
    echo "rm -rf .next"
    echo "npm run build"
    echo "pm2 restart sinispace"
    echo ""
    exit 0
fi

# Zeige Änderungen
echo -e "${YELLOW}📝 Änderungen gefunden:${NC}"
git status --short
echo ""

# Frage nach Commit
read -p "Diese Änderungen committen und pushen? (yes/no): " COMMIT

if [ "$COMMIT" != "yes" ]; then
    echo -e "${YELLOW}❌ Abgebrochen.${NC}"
    exit 0
fi

# Commit-Message
read -p "Commit-Message: " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="UPDATE: $(date +"%Y-%m-%d %H:%M:%S")"
fi

# Commit
echo ""
echo -e "${YELLOW}📦 Committe Änderungen...${NC}"
git add -A
git commit -m "$COMMIT_MSG"

# Push
echo ""
read -p "Zu GitHub pushen? (yes/no): " PUSH

if [ "$PUSH" = "yes" ]; then
    echo -e "${YELLOW}📤 Pushe zu GitHub...${NC}"
    git push origin main
    echo -e "${GREEN}✅ Zu GitHub gepusht!${NC}"
else
    echo -e "${YELLOW}⚠️  Nicht gepusht - bitte manuell pushen!${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment vorbereitet!${NC}"
echo ""
echo -e "${BLUE}📋 Server-Build-Befehle:${NC}"
echo -e "${YELLOW}   Kopiere diese Befehle und führe sie auf dem Server aus:${NC}"
echo ""
echo "cd /var/www/sinispace-v2"
echo "git pull origin main"
echo "npm install"
echo "npx prisma generate"
echo "rm -rf .next"
echo "npm run build"
echo "pm2 restart sinispace"
echo ""
echo -e "${BLUE}📋 Oder als ein Befehl:${NC}"
echo "cd /var/www/sinispace-v2 && git pull origin main && npm install && npx prisma generate && rm -rf .next && npm run build && pm2 restart sinispace"
echo ""
