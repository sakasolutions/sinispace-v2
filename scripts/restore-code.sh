#!/bin/bash

# Code-Restore Script
# Stellt Code von einem Git Tag wieder her

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Prüfe ob Git Repository
if [ ! -d .git ]; then
    echo -e "${RED}❌ Kein Git Repository gefunden!${NC}"
    exit 1
fi

# Liste verfügbare Backup-Tags
echo -e "${BLUE}📋 Verfügbare Code-Backups (Tags):${NC}"
TAGS=($(git tag -l "backup_*" | sort -r | head -10))

if [ ${#TAGS[@]} -eq 0 ]; then
    echo -e "${RED}❌ Keine Backup-Tags gefunden!${NC}"
    exit 1
fi

for i in "${!TAGS[@]}"; do
    TAG="${TAGS[$i]}"
    TAG_DATE=$(git log -1 --format=%ai "$TAG" 2>/dev/null || echo "unbekannt")
    TAG_COMMIT=$(git rev-parse --short "$TAG" 2>/dev/null || echo "unbekannt")
    echo -e "   [$i] ${TAG} (${TAG_COMMIT}) - ${TAG_DATE}"
done

# Frage nach Tag
echo ""
read -p "Welches Backup wiederherstellen? (Nummer oder Tag-Name): " SELECTION

if [[ "$SELECTION" =~ ^[0-9]+$ ]] && [ "$SELECTION" -lt "${#TAGS[@]}" ]; then
    SELECTED_TAG="${TAGS[$SELECTION]}"
elif git rev-parse "$SELECTION" >/dev/null 2>&1; then
    SELECTED_TAG="$SELECTION"
else
    echo -e "${RED}❌ Ungültige Auswahl!${NC}"
    exit 1
fi

# Zeige Info
TAG_COMMIT=$(git rev-parse --short "$SELECTED_TAG")
TAG_DATE=$(git log -1 --format=%ai "$SELECTED_TAG")
TAG_MESSAGE=$(git tag -l --format='%(contents)' "$SELECTED_TAG" 2>/dev/null || echo "Keine Nachricht")

echo ""
echo -e "${BLUE}📋 Backup-Info:${NC}"
echo -e "   Tag: ${SELECTED_TAG}"
echo -e "   Commit: ${TAG_COMMIT}"
echo -e "   Datum: ${TAG_DATE}"
echo -e "   Nachricht: ${TAG_MESSAGE}"

# Warnung
echo ""
echo -e "${RED}⚠️  WARNUNG: Dies wird deinen aktuellen Code überschreiben!${NC}"
echo -e "${YELLOW}   Alle uncommitted changes gehen verloren!${NC}"
read -p "Fortfahren? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Abgebrochen.${NC}"
    exit 0
fi

# Prüfe ob uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted Changes gefunden!${NC}"
    read -p "   Diese verwerfen? (yes/no): " DISCARD
    
    if [ "$DISCARD" = "yes" ]; then
        git reset --hard HEAD
        git clean -fd
    else
        echo -e "${YELLOW}   Stash uncommitted changes...${NC}"
        git stash push -m "Stash vor Restore: ${SELECTED_TAG}"
    fi
fi

# Checkout Tag
echo -e "${YELLOW}📦 Stelle Code wieder her...${NC}"
git checkout "$SELECTED_TAG"

echo -e "${GREEN}✅ Code erfolgreich wiederhergestellt!${NC}"
echo -e "   Tag: ${SELECTED_TAG}"
echo -e "   Commit: ${TAG_COMMIT}"
echo ""
echo -e "${YELLOW}💡 Tipp: Um zurück zum neuesten Stand zu kommen:${NC}"
echo -e "   git checkout main"
echo -e "   git pull origin main"
