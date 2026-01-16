# Logs abrufen für Debugging

## 1. PM2 Server-Logs (WICHTIG!)

**Auf dem Server im Terminal:**

```bash
# Alle Logs anzeigen (letzte 100 Zeilen)
pm2 logs sinispace --lines 100

# Oder Echtzeit-Logs (verlässt man mit Ctrl+C)
pm2 logs sinispace

# Oder nur Fehler-Logs
pm2 logs sinispace --err --lines 50
```

**Diese Logs zeigen:**
- ✅ Assistant erstellt
- 📎 Dateien angehängt
- ✅ Thread erstellt
- ✅ Run gestartet
- ⏳ Warte-Logs
- ❌ Fehler

---

## 2. Browser-Console-Logs (Client-seitig)

**Im Browser:**

1. **Chrome/Edge:** `F12` oder `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. Gehe zum Tab **"Console"**
3. Versuche die Datei hochzuladen
4. Kopiere alle roten Fehler-Meldungen

**Was zu suchen:**
- Netzwerk-Fehler (404, 500, etc.)
- JavaScript-Fehler
- API-Response-Fehler

---

## 3. Network-Tab (API-Requests)

**Im Browser:**

1. Öffne DevTools (`F12`)
2. Gehe zum Tab **"Network"**
3. Filtere nach **"Fetch/XHR"**
4. Versuche die Datei hochzuladen und zu senden
5. Klicke auf den Request zu `/api/documents/upload`
6. Gehe zu **"Response"** Tab → Kopiere die Antwort
7. Klicke auf den Request zu `/api/chat` (oder was auch immer der Chat-Endpoint ist)
8. Kopiere auch diese Antwort

**Was zu suchen:**
- Upload-Response (sollte `{ success: true, ... }` sein)
- Chat-Response (sollte die AI-Antwort sein)

---

## 4. Server-Terminal (während Build)

**Auf dem Server beim Build:**

```bash
cd /var/www/sinispace-v2
npm run build 2>&1 | tee build.log
```

Dies speichert Build-Logs in `build.log`.

---

## 5. Was genau passiert?

**Bitte beschreibe:**

1. **Wird die Datei hochgeladen?** (Siehst du sie im UI unter dem Input-Feld?)
2. **Wird die Datei beim Abschicken mitgeschickt?** (Wird sie aus der Liste entfernt?)
3. **Kommt eine Antwort von der KI?** (Auch wenn sie nicht die Datei analysiert?)
4. **Oder kommt gar keine Antwort?**
5. **Was steht in der Browser-Console?** (Siehe Punkt 2 oben)

---

## 6. Vollständige Debug-Info sammeln

**Bitte sende mir:**

1. **PM2-Logs** (von Punkt 1, mindestens 50 Zeilen nach dem Upload-Versuch)
2. **Browser-Console-Fehler** (von Punkt 2)
3. **Network-Response** vom Upload-Request (von Punkt 3)
4. **Beschreibung** was genau passiert (von Punkt 5)
