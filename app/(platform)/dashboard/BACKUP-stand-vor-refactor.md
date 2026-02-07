# Backup: Stand vor DashboardShell-Refactor

**Datum:** 2026-02-07  
**Zweck:** Falls wir auf den Stand vor dem DashboardShell-Refactor zurück müssen.

---

## Anweisung für Agent: "Letztes Backup einspielen"

**Wenn der User "letztes Backup einspielen" sagt:** Alles auf den Stand dieses Backups zurücksetzen.

1. In `app/(platform)/dashboard/dashboard-client.tsx`:
   - Import ersetzen: `import { DashboardShell } from '@/components/platform/dashboard-shell';` → `import { PageTransition } from '@/components/ui/PageTransition';`
   - Den gesamten Block von `<DashboardShell` (inkl. aller Props) bis `</DashboardShell>` ersetzen durch: zuerst den **Header-Block** (von `{/* Header: komprimierte Höhe */}` bis `</header>`), dann `{/* Main Container */}` + `<PageTransition className="relative z-10 mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-32 md:pb-32 -mt-20">` + `{/* Content */}` + `{sortedTools.length > 0 ? (` – der **Inhalt** (space-y-6 div, Sektionen, Accordions, Empty State) bleibt unverändert; nur das schließende Tag ist `</PageTransition>` statt `</DashboardShell>`.
2. Optional: `components/platform/dashboard-shell.tsx` kann danach gelöscht werden (oder bleiben, wird nur nicht mehr genutzt).

Der exakte Ersetzungsblock steht im Snippet unten.

---

## Aktuell (mit Refactor)

- `dashboard-client.tsx` nutzt `DashboardShell` aus `@/components/platform/dashboard-shell`.
- Import: `import { DashboardShell } from '@/components/platform/dashboard-shell';`
- Header + Overlap sind in der Shell gekapselt.

## Zurück zum Stand vor dem Refactor

1. **Import in `dashboard-client.tsx` ändern:**
   - Von: `import { DashboardShell } from '@/components/platform/dashboard-shell';`
   - Zu: `import { PageTransition } from '@/components/ui/PageTransition';`

2. **Den gesamten `<DashboardShell ...> ... </DashboardShell>`-Block ersetzen** durch den Inhalt aus der Datei `snippet-stand-vor-refactor.txt` (siehe unten).  
   Das ist der ursprüngliche `<header>...</header>` plus `<PageTransition>...</PageTransition>` mit dem gleichen Children-Inhalt (sortedTools, Accordions, Empty State).

3. **Optional:** Komponente `components/platform/dashboard-shell.tsx` kann dann gelöscht oder deaktiviert werden.

## Snippet: Ersetzungsblock (Stand vor Refactor)

Die folgende Struktur war vor dem Refactor im Einsatz. Beim Zurückgehen den kompletten `<DashboardShell>`-Block (vom öffnenden Tag inkl. aller Props bis zum schließenden `</DashboardShell>`) durch diesen Block ersetzen – dabei den **Inhalt zwischen** `<PageTransition>` und `</PageTransition>` unverändert lassen (also `{sortedTools.length > 0 ? ( ... ) : ( ... )}` inkl. aller Sektionen).

```jsx
      {/* Header: komprimierte Höhe – ragt nur noch so weit in die oberen Karten; Layer 0 + Layer 1 */}
      <header
        className={cn(
          'relative z-[1] min-h-[280px]',
          'w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
          '-mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
        )}
      >
        {/* Layer 0: Hintergrund – klebt oben (Margin zieht in Safe-Area); Sonne/Mond kleiner, voll im Bild */}
        <div
          className={cn(
            'absolute top-0 left-0 w-full h-[280px] z-0 overflow-hidden rounded-b-[40px] transition-all duration-1000',
            timeOfDay === 'sunrise'
              ? 'bg-gradient-to-br from-orange-200 via-rose-200 to-violet-200'
              : 'bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-slate-900 backdrop-blur-xl border-b border-white/5'
          )}
          aria-hidden
        >
          {timeOfDay === 'sunrise' ? (
            <>
              <div className="absolute top-0 left-0 w-[80%] h-[180px] rounded-full bg-orange-200/60 blur-[80px] pointer-events-none transition-opacity duration-1000" aria-hidden />
              <div className="absolute bottom-0 right-0 w-[60%] h-[180px] rounded-full bg-purple-200/60 blur-[80px] pointer-events-none transition-opacity duration-1000" aria-hidden />
              <div className="absolute -top-6 -right-6 text-orange-300/20 pointer-events-none" aria-hidden>
                <Sun className="w-40 h-40 md:w-48 md:h-48" />
              </div>
            </>
          ) : (
            <>
              <div className="absolute top-0 left-0 w-[80%] h-[180px] rounded-full bg-blue-500/20 blur-[80px] pointer-events-none transition-opacity duration-1000" aria-hidden />
              <div className="absolute bottom-0 right-0 w-[60%] h-[180px] rounded-full bg-violet-500/20 blur-[80px] pointer-events-none transition-opacity duration-1000" aria-hidden />
              <div className="absolute -top-6 -right-6 text-white/10 pointer-events-none" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,200,0.3))' }} aria-hidden>
                <Moon className="w-40 h-40 md:w-48 md:h-48" />
              </div>
            </>
          )}
        </div>

        {/* Layer 1: Header-Content nach oben (md:pt-16), wie Gourmet-Dashboard */}
        <div className="dashboard-header-pt md:pt-12 relative z-10 w-full px-3 sm:px-6 md:px-8 pb-6">
          <div className="max-w-2xl">
            <h1
              className={cn(
                'text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mt-0',
                timeOfDay === 'sunrise' ? 'text-gray-900' : 'text-white'
              )}
              style={{ letterSpacing: '-0.3px' }}
            >
              {greetingText}
            </h1>
            <p
              className={cn(
                'text-sm sm:text-base mt-1 font-normal',
                timeOfDay === 'sunrise' ? 'text-gray-500 opacity-65' : 'text-white/80'
              )}
              style={{ letterSpacing: '0.1px' }}
            >
              {sunriseGreeting.subline}
            </p>
            {/* Info-Chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={cn(
                  'backdrop-blur-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center shrink-0',
                  timeOfDay === 'sunrise'
                    ? 'bg-white/20 border border-white/20 text-gray-800'
                    : 'bg-white/10 border border-white/20 text-white/80'
                )}
              >
                <Calendar className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
                2 Termine
              </span>
              <span
                className={cn(
                  'backdrop-blur-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center shrink-0',
                  timeOfDay === 'sunrise'
                    ? 'bg-white/20 border border-white/20 text-gray-800'
                    : 'bg-white/10 border border-white/20 text-white/80'
                )}
              >
                <ShoppingCart className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
                4 Offen
              </span>
              <span
                className={cn(
                  'backdrop-blur-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center shrink-0',
                  timeOfDay === 'sunrise'
                    ? 'bg-white/20 border border-white/20 text-gray-800'
                    : 'bg-white/10 border border-white/20 text-white/80'
                )}
              >
                <CheckCircle className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
                Alles erledigt
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Grid ragt in den komprimierten Header (gleicher optischer Schnitt in die oberen Karten) */}
      <PageTransition className="relative z-10 mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-32 md:pb-32 -mt-20">
        {/* Content: Zuletzt verwendet + Kategorie-Sektionen */}
        {sortedTools.length > 0 ? (
```

**Wichtig:** Nach dem obigen Block kommt unverändert der bisherige Inhalt (die `<div className="space-y-6 md:space-y-8">` mit Sektionen und Accordions) und am Ende `) : ( ... )}` für den Empty State, danach schließend:

```jsx
        )}
      </PageTransition>
```

(Statt `</DashboardShell>` also `</PageTransition>` verwenden.)
