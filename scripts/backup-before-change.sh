#!/bin/bash

# Einfaches Backup vor Änderungen
# Committet aktuellen Stand + erstellt DB-Backup

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Erstelle Backup vor Änderungen...${NC}"
echo ""

# Prüfe ob Git Repository
if [ ! -d .git ]; then
    echo -e "${RED}❌ Kein Git Repository gefunden!${NC}"
    exit 1
fi

# Prüfe ob uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}📝 Uncommitted Changes gefunden${NC}"
    
    # Zeige Status
    git status --short
    
    echo ""
    read -p "Diese Änderungen committen? (yes/no): " COMMIT_CHANGES
    
    if [ "$COMMIT_CHANGES" = "yes" ]; then
        git add -A
        
        # Frage nach Commit-Message
        read -p "Commit-Message (oder Enter für Auto): " COMMIT_MSG
        
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="BACKUP: $(date +"%Y-%m-%d %H:%M:%S") - Vor Änderungen"
        fi
        
        git commit -m "$COMMIT_MSG"
        
        # Push zu GitHub
        read -p "Zu GitHub pushen? (yes/no): " PUSH
        
        if [ "$PUSH" = "yes" ]; then
            git push origin main
            echo -e "${GREEN}✅ Code zu GitHub gepusht!${NC}"
        fi
        
        echo -e "${GREEN}✅ Code committed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Code nicht committed - aber DB-Backup wird trotzdem erstellt${NC}"
    fi
else
    echo -e "${GREEN}✅ Keine uncommitted changes${NC}"
fi

echo ""

# Datenbank-Backup
echo -e "${YELLOW}📦 Erstelle Datenbank-Backup...${NC}"
bash ./scripts/backup-db.sh

echo ""
echo -e "${GREEN}✅ Backup fertig!${NC}"
echo ""
echo -e "${BLUE}📋 Backup-Info:${NC}"

# Zeige aktuellen Commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
CURRENT_BRANCH=$(git branch --show-current)
echo -e "   Code: Commit ${CURRENT_COMMIT} auf ${CURRENT_BRANCH}"
echo -e "   DB: Siehe backups/db/"

echo ""
echo -e "${YELLOW}💡 Zum Zurückkehren:${NC}"
echo -e "   Code: git checkout ${CURRENT_COMMIT}"
echo -e "   DB: npm run restore:db"
