# CookIQ – Aktueller Stand (für Gemini / Onboarding)

**Letzte Aktualisierung:** März 2026  
**Zweck:** Vollständiger Überblick über alle CookIQ-Features, Workflows, Datenflüsse und den aktuellen Implementierungsstand.

---

## 1. Was ist CookIQ?

**CookIQ** ist das KI-gestützte Koch- und Essensplanungs-Tool innerhalb von Sinispace. Es umfasst:

- **Rezept-Generator** (aus Zutaten oder Wunsch)
- **Wochenplaner** (AI generiert 7-Tage-Plan, Finalisieren → Kalender + optional SmartCart)
- **Meine Sammlung** (gespeicherte Rezepte aus Result/Workspace)
- **SmartCart** (Einkaufslisten; Verknüpfung mit Rezepten und Wochenplan)
- **Kalender-Integration** (Gerichte als Events in `CalendarEvent`)

**Route:** `/tools/recipe`  
**Premium:** Alle KI-Funktionen (Wochenplan, JIT-Rezept, Master-SmartCart) erfordern Premium (`isUserPremium()`).

---

## 2. Oberfläche & Ansichten

### 2.1 Zwei Haupt-Ansichten auf `/tools/recipe`

| Ansicht | Bedingung | Beschreibung |
|--------|-----------|--------------|
| **Cockpit (Dashboard)** | `showCockpit === true` (Initial) | Landing: Header „CookIQ / Was kochen wir heute?“, CTA „Vorschlag generieren“, 2×2-Grid + optional Full-Width „Aktive Woche“. |
| **Arbeitsbereich** | `showCockpit === false` | Header mit „Zurück zur Übersicht“, Tabs „Rezept Generator“ und „Meine Sammlung“, Wizard/Liste je nach Tab. |

### 2.2 Cockpit – 2×2-Grid (immer sichtbar)

1. **Woche planen** – Button → öffnet Wochenplaner-Modal (Phase `setup`).
2. **Sammlung** – Link → `/tools/recipe?tab=my-recipes` (setzt Tab „Meine Sammlung“).
3. **Wunschgericht** – Button → öffnet „Magic“-Modal (Wunsch-Input).
4. **SmartCart** – Link → `/tools/shopping-list`.

Alle vier nutzen **Glass-Design** (`cardClass` + `CARD_STYLE` in `gourmet-cockpit.tsx`).

### 2.3 Full-Width-Karte „Aktive Woche“ (nur bei aktivem Plan)

- **Sichtbar nur wenn:** `activeWeekPlan` ist ein nicht leeres Array **und** `onAktiveWocheAnsehen` übergeben.
- **Inhalt (aktuell statisch im UI):** Badge „Aktive Woche“, „Tag 3 • Abendessen“, Headline „Lachs aus dem Ofen“, Subtext „Mit Ofengemüse und Rosmarinkartoffeln“, Buttons „Jetzt kochen“ und Detail-Icon.
- **Aktion:** Klick auf Karte oder Buttons → `onAktiveWocheAnsehen()` → Modal mit `plannerPhase === 'active-view'` und `weekDraft = activeWeekPlan`.
- **Hinweis:** `activeWeekPlan` lebt nur im Client-State; nach Reload ist die Karte weg, wenn der Plan nicht aus DB geladen wird.

### 2.4 Tabs im Arbeitsbereich

- **create** – Rezept-Generator (Zutaten/Wunsch, Kategorie, Filter, „Zaubern“ → KI-Rezept, Speicherung in Result, Redirect zu Detail).
- **my-recipes** – Liste gespeicherter Rezepte (Result mit toolName „CookIQ“), Klick öffnet `RecipeDetailView` (Detailansicht mit „Im Kalender planen“, Einkaufsliste etc.).

---

## 3. Wochenplaner – komplette Workflows

### 3.1 Phasen (State: `plannerPhase`)

| Phase | Bedeutung |
|-------|-----------|
| `setup` | Konfiguration: Mahlzeiten (Frühstück/Mittag/Abend) wählen, Filter-Chips, optional „Weitere Wünsche“. Button „Wochenplan zaubern“. |
| `loading` | KI generiert Entwurf (Spinner, „Dein Speiseplan entsteht…“). |
| `lab` | Entwurf sichtbar: 7 Tage, pro Tag Mahlzeiten mit Titel/Zeit/Kalorien. Aktionen: Re-Roll (ein Gericht neu), Swap (Verschieben auf anderen Tag). Button „Plan finalisieren & speichern“. |
| `committing` | Speicher-Lade-Phase: Raketen-Animation, „Raketenstart…“, dann Backend-Call. |
| `active-view` | Lese-Ansicht des **gespeicherten** Plans: nur Anzeige + „Rezept ›“ (JIT) + „In Sammlung speichern“ (Heart) + „Zutaten für die Woche einkaufen“ (Master-SmartCart). Kein Re-Roll/Swap. |

### 3.2 Flow A: Neuen Plan erstellen und finalisieren

1. User klickt **„Woche planen“** (Cockpit) → `setPlannerPhase('setup')`, `setIsWeekPlannerOpen(true)`.
2. Im Modal: Mahlzeiten ankreuzen, ggf. Filter (z. B. Vegetarisch, Unter 30 Min), optional Freitext → **„Wochenplan zaubern“**.
3. `setPlannerPhase('loading')` → Action **`generateWeekDraft(weekMeals, selectedWeekFilters, customWeekPrompt)`** (`actions/week-planner-ai.ts`).
4. Bei Erfolg: `setWeekDraft(res.draft)`, `setPlannerPhase('lab')`.
5. Im Labor: User kann Re-Roll (`regenerateSingleMealDraft`) oder Swap (`handleSwapMeal`) nutzen.
6. **„Plan finalisieren & speichern“** → `setPlannerPhase('committing')` → **`saveWeeklyPlan(weekDraft)`**.
7. Backend: nächster Montag berechnen, `planData` (date, title, mealType) bauen, **`saveWeeklyPlanToCalendar(planData)`** (calendar-actions) → löscht alte Meal-Events im Zeitraum, erstellt neue `CalendarEvent`-Einträge. Danach 2 s Delay (UX).
8. Bei Erfolg: `setActiveWeekPlan(weekDraft)`, Modal schließen, `setPlannerPhase('setup')` (nach 500 ms). Die Cockpit-Karte „Aktive Woche“ erscheint, weil `activeWeekPlan` jetzt gesetzt ist.

### 3.3 Flow B: Aktiven Plan ansehen / weiter nutzen

1. User klickt auf die **Full-Width-Karte „Aktive Woche“** (oder würde von dort kommen) → `setWeekDraft(activeWeekPlan)`, `setPlannerPhase('active-view')`, `setIsWeekPlannerOpen(true)`.
2. Im Modal: Liste aller Tage/Gerichte (read-only). Pro Gericht:
   - **Heart-Button:** „In Sammlung speichern“ → **`generateAndSaveFullRecipe(meal.title, meal.calories, meal.time)`** → KI erzeugt volles Rezept, **`saveResult`** (Workspace/Result), dann `setSavedRecipeIds` (optisch ausgefülltes Herz). Kein Öffnen der Detailansicht danach (nur Alert).
   - **„Rezept ›“:** **`handleOpenRecipe(day, meal)`** → gleiche Action `generateAndSaveFullRecipe` → Alert „in Sammlung gespeichert“. Detailansicht wird **nicht** geöffnet (Kommentar im Code für später).
3. **„Zutaten für die Woche einkaufen“** → **`generateMasterShoppingList(weekDraft)`** → KI erzeugt aggregierte Einkaufsliste aus Titeln, **`getShoppingLists`** / **`appendToList`** / **`saveShoppingLists`** (UserShoppingLists). Dann `setIsWeekPlannerOpen(false)`, **`router.push('/tools/shopping-list')`**.

### 3.4 Flow C: Plan verwerfen

- In **active-view** gibt es den Button **„Plan löschen“** (oben rechts) → `confirm()` → `setActiveWeekPlan(null)`, Modal schließen. Kein Backend-Call (Kalender-Events bleiben; nur Client-State wird geleert).

---

## 4. Backend-Actions (Übersicht)

| Action | Datei | Funktion |
|--------|--------|----------|
| **generateWeekDraft** | week-planner-ai.ts | KI (gpt-4o-mini) erzeugt 7-Tage-Plan (Titel, Zeit, Kalorien pro Mahlzeit). Premium-Check. |
| **regenerateSingleMealDraft** | week-planner-ai.ts | Ersetzt ein Gericht im Entwurf (Re-Roll). |
| **saveWeeklyPlan** | week-planner-ai.ts | Berechnet nächsten Montag, baut `planData`, ruft **saveWeeklyPlanToCalendar** auf; 2 s Delay. |
| **saveWeeklyPlan** | calendar-actions.ts | Löscht Meal-Events im Datumsbereich, erstellt neue `CalendarEvent` (eventType: 'meal', title, date, time, mealType, resultId optional). |
| **generateAndSaveFullRecipe** | week-planner-ai.ts | Aus Titel/Kalorien/Zeit: KI erzeugt volles Rezept (recipeName, stats, ingredients, shoppingList, instructions, chefTip, categoryIcon), **saveResult** (toolId 'recipe', toolName 'CookIQ'). Gibt `{ success, recipe, resultId }` zurück. |
| **generateMasterShoppingList** | week-planner-ai.ts | KI erzeugt aus allen Gerichtstiteln + Kalorien eine aggregierte Einkaufsliste (items[]), speichert in **UserShoppingLists** via getShoppingLists/appendToList/saveShoppingLists. |
| **generateRecipe** | recipe-ai.ts | Klassischer Rezept-Generator (Zutaten/Wunsch, Kategorie, Filter), speichert Result, optional Helper-Chat, Unsplash-Bild. |

---

## 5. Persistenz vs. Client-State

| Daten | Wo gespeichert | Hinweis |
|-------|----------------|---------|
| **Wochenplan-Entwurf (lab)** | Nur Client (`weekDraft`) | Geht bei Reload verloren, bis „Plan finalisieren“ geklickt wurde. |
| **Aktiver Wochenplan (nach Finalisieren)** | Client (`activeWeekPlan`) + **Kalender** | Kalender: `CalendarEvent` (DB). `activeWeekPlan` wird **nicht** in DB (z. B. WeeklyPlan) geschrieben; Kommentar in saveWeeklyPlan: „optional“. Nach Reload ist die Cockpit-Karte „Aktive Woche“ leer. |
| **Rezepte (Sammlung)** | **Result** (Workspace), User zugeordnet | toolId 'recipe', toolName 'CookIQ'. Über getWorkspaceResults/getResultById abrufbar. |
| **Einkaufsliste (SmartCart)** | **UserShoppingLists** (listsJson) | Pro User eine Zeile; JSON-Array von Listen mit Items. |
| **Kalender-Mahlzeiten** | **CalendarEvent** (eventType 'meal') | date, time, title, mealType, recipeId/resultId (optional). |

---

## 6. Bekannte Lücken / TODOs

- **activeWeekPlan nach Reload:** Kein Laden aus DB; 5. Karte (Aktive Woche) erscheint nur, wenn in derselben Session finalisiert wurde. Option: WeeklyPlan-Tabelle oder CalendarEvent für „aktuellen Plan“ auslesen.
- **„Rezept ›“ in active-view:** Nach JIT-Speicherung wird nur ein Alert gezeigt; **kein** Öffnen der Rezept-Detailansicht (RecipeDetailView). Kommentar im Code: „Hier später setSelectedRecipe(res.recipe); setIsRecipeViewOpen(true)“.
- **„Jetzt kochen“ auf der Full-Width-Karte:** Führt aktuell nur zu `onAktiveWocheAnsehen()` (öffnet active-view). Kein direkter Sprung zum heutigen Rezept oder zur Kochansicht.
- **Aktive-Woche-Karte Inhalt:** Tag/Gericht/Subtext sind **statisch** („Tag 3 • Abendessen“, „Lachs aus dem Ofen“). Keine Anbindung an `activeWeekPlan` für dynamischen „heutigen“ Eintrag.
- **2 s Delay in saveWeeklyPlan:** Künstlich für Raketen-Animation; kann entfernt werden.
- **Premium:** Alle Wochenplan- und JIT-Funktionen prüfen `isUserPremium()`; Free-User erhalten Fehlermeldung.

---

## 7. Wichtige Dateien

| Datei | Rolle |
|-------|--------|
| **app/(platform)/tools/recipe/page.tsx** | Hauptseite: showCockpit, activeTab, Wochenplaner-Modal, plannerPhase, weekDraft, activeWeekPlan, handleOpenRecipe, handleSwapMeal, handleReRollMeal, Integration GourmetCockpit. |
| **components/recipe/gourmet-cockpit.tsx** | Cockpit-UI: 2×2-Grid, Full-Width „Aktive Woche“, Props: onWochePlanen, onAktiveWocheAnsehen, activeWeekPlan, onVorschlagGenerieren, onMagicWunsch. |
| **actions/week-planner-ai.ts** | generateWeekDraft, regenerateSingleMealDraft, saveWeeklyPlan, generateAndSaveFullRecipe, generateMasterShoppingList. Typen: WeekDraftDay, WeekDraftMeal. |
| **actions/calendar-actions.ts** | saveWeeklyPlan(planData: WeeklyPlanEntry[]) → CalendarEvent createMany/deleteMany. |
| **actions/shopping-list-actions.ts** | getShoppingLists, saveShoppingLists (UserShoppingLists). |
| **actions/workspace-actions.ts** | saveResult (für Rezepte/JIT), getWorkspaceResults, getResultById. |
| **lib/shopping-lists-storage.ts** | appendToList, defaultList, Typen ShoppingList, ShoppingItem. |
| **components/recipe/recipe-detail-view.tsx** | Detailansicht eines Rezepts (von Sammlung); „Im Kalender planen“ nutzt scheduleSingleRecipe (calendar-actions). |

---

## 8. Kurz: Was funktioniert heute

- Cockpit mit 4 Karten + optionale 5. Karte (wenn `activeWeekPlan` gesetzt).
- Wochenplaner: Setup → Loading → Labor (Re-Roll, Swap) → Finalisieren → Committing → Kalender-Sync, `activeWeekPlan` im State.
- Active-View: Anzeige Plan, „In Sammlung speichern“ (Heart), „Rezept ›“ (JIT in Sammlung), „Zutaten für die Woche einkaufen“ (Master-SmartCart + Redirect zu /tools/shopping-list).
- Rezept-Generator (Create-Tab) und Sammlung (My-Recipes, RecipeDetailView, Kalender-Planung pro Rezept) unverändert im Einsatz.
- Kalender: Meal-Events aus saveWeeklyPlan; einzelne Rezepte aus Detail-View via scheduleSingleRecipe.

Wenn du willst, kann ich daraus noch eine kürzere „Gemini-Prompt-Version“ (z. B. 1 Seite) extrahieren oder einen Abschnitt (z. B. nur Workflows oder nur Lücken) hervorheben.
