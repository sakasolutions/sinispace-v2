#!/bin/bash

# Code-Backup Script
# Erstellt einen Git Tag für den aktuellen Stand

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfe ob Git Repository
if [ ! -d .git ]; then
    echo -e "${RED}❌ Kein Git Repository gefunden!${NC}"
    exit 1
fi

# Prüfe ob uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted Changes gefunden!${NC}"
    echo -e "   Möchtest du diese committen bevor du ein Backup erstellst?"
    read -p "   (yes/no): " COMMIT_CHANGES
    
    if [ "$COMMIT_CHANGES" = "yes" ]; then
        git add -A
        read -p "   Commit-Message: " COMMIT_MSG
        git commit -m "$COMMIT_MSG"
    else
        echo -e "${YELLOW}   Backup wird trotzdem erstellt (mit uncommitted changes)${NC}"
    fi
fi

# Erstelle Backup-Tag
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TAG_NAME="backup_${TIMESTAMP}"
COMMIT_HASH=$(git rev-parse --short HEAD)

echo -e "${YELLOW}📦 Erstelle Code-Backup...${NC}"
echo -e "   Tag: ${TAG_NAME}"
echo -e "   Commit: ${COMMIT_HASH}"

# Erstelle Git Tag
git tag -a "$TAG_NAME" -m "Backup: ${TIMESTAMP} - ${COMMIT_HASH}"

# Push Tag zu Remote (optional)
read -p "Tag zu GitHub pushen? (yes/no): " PUSH_TAG

if [ "$PUSH_TAG" = "yes" ]; then
    git push origin "$TAG_NAME"
    echo -e "${GREEN}✅ Tag zu GitHub gepusht!${NC}"
else
    echo -e "${YELLOW}   Tag nur lokal erstellt${NC}"
fi

echo -e "${GREEN}✅ Code-Backup erfolgreich erstellt!${NC}"
echo -e "   Tag: ${TAG_NAME}"
echo -e "   Commit: ${COMMIT_HASH}"
echo -e "   Zeitstempel: ${TIMESTAMP}"
