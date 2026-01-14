# 🔔 Stripe Webhook Setup für Payment Links

## ⚠️ WICHTIG: Unterschied zwischen Checkout Sessions und Payment Links

**Checkout Sessions** (alter Weg):
- Können Metadata enthalten (`userId`)
- Werden programmatisch erstellt
- Haben vollständige Kontrolle

**Payment Links** (neuer Weg):
- Haben KEINE Metadata
- Werden in Stripe Dashboard erstellt
- Webhook muss User über E-Mail finden

## 📋 Webhook in Stripe konfigurieren

### Schritt 1: Stripe Dashboard öffnen
1. Gehe zu [Stripe Dashboard](https://dashboard.stripe.com/)
2. Wähle dein **Live** oder **Test** Konto (je nachdem, was du verwendest)

### Schritt 2: Webhooks öffnen
1. Klicke auf **"Developers"** (links in der Sidebar)
2. Klicke auf **"Webhooks"**
3. Klicke auf **"Add endpoint"** (wenn noch keiner existiert)
   ODER bearbeite den bestehenden Webhook

### Schritt 3: Webhook-Endpoint konfigurieren

**Endpoint URL:**
```
https://deine-domain.com/api/webhooks
```

**Für Localhost/Development:**
- Nutze [Stripe CLI](https://stripe.com/docs/stripe-cli) zum Testen
- Oder nutze einen Tunnel-Service wie [ngrok](https://ngrok.com/)

**Events auswählen:**
- ✅ `checkout.session.completed` (WICHTIG!)

### Schritt 4: Webhook Secret kopieren

1. Nach dem Erstellen/Bearbeiten des Webhooks
2. Klicke auf den Webhook
3. Klicke auf **"Reveal"** neben "Signing secret"
4. Kopiere den Secret (beginnt mit `whsec_...`)
5. Füge ihn zu deiner `.env.local` hinzu:

```env
STRIPE_WEBHOOK_SECRET=whsec_dein_secret_hier
```

## 🔧 Webhook-Code Anpassungen

Der Webhook wurde bereits angepasst, um mit Payment Links zu funktionieren:

1. **Zuerst**: Versucht `metadata.userId` (für Checkout Sessions)
2. **Fallback**: Findet User über E-Mail (für Payment Links)

## 🧪 Webhook testen

### Option 1: Stripe CLI (Empfohlen für Development)

```bash
# Stripe CLI installieren (falls nicht vorhanden)
# macOS: brew install stripe/stripe-cli/stripe
# Oder: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Webhook weiterleiten
stripe listen --forward-to localhost:3000/api/webhooks

# In einem anderen Terminal: Test-Event senden
stripe trigger checkout.session.completed
```

### Option 2: Stripe Dashboard

1. Gehe zu **Developers** → **Webhooks**
2. Klicke auf deinen Webhook
3. Klicke auf **"Send test webhook"**
4. Wähle `checkout.session.completed`
5. Klicke auf **"Send test webhook"**

### Option 3: Echter Test-Kauf

1. Nutze einen Test-Payment Link
2. Bezahle mit Test-Karte: `4242 4242 4242 4242`
3. Prüfe die Server-Logs auf Webhook-Events

## 📊 Webhook-Logs prüfen

### In Stripe Dashboard:
1. **Developers** → **Webhooks**
2. Klicke auf deinen Webhook
3. Sieh dir die **"Recent events"** an
4. Klicke auf ein Event, um Details zu sehen

### In deiner App:
- Server-Logs zeigen:
  - `🔔 Event empfangen: checkout.session.completed`
  - `👤 User gefunden über E-Mail: ...`
  - `✅ ERFOLG: User ... wurde freigeschaltet!`

## ⚠️ Wichtige Hinweise

### Payment Link Konfiguration:
1. Stelle sicher, dass dein Payment Link die **E-Mail des Kunden** erfasst
2. In Stripe Dashboard → **Payment Links** → Dein Link
3. Prüfe, dass **"Collect customer email"** aktiviert ist

### E-Mail-Matching:
- Der Webhook findet User über die **exakte E-Mail-Adresse**
- Die E-Mail muss in deiner Datenbank existieren
- Groß-/Kleinschreibung wird ignoriert (Prisma macht das automatisch)

### Sicherheit:
- Webhook Secret ist **KRITISCH** - niemals committen!
- Nutze immer HTTPS in Production
- Prüfe die Webhook-Signatur (wird automatisch gemacht)

## 🐛 Troubleshooting

**Problem**: Webhook wird nicht aufgerufen
- **Lösung**: Prüfe, ob die URL korrekt ist und erreichbar ist
- **Lösung**: Prüfe, ob `checkout.session.completed` Event ausgewählt ist

**Problem**: "User not found by email"
- **Lösung**: Prüfe, ob die E-Mail in der Datenbank existiert
- **Lösung**: Prüfe, ob Payment Link die E-Mail erfasst

**Problem**: "Webhook Signatur Fehler"
- **Lösung**: Prüfe, ob `STRIPE_WEBHOOK_SECRET` korrekt ist
- **Lösung**: Nutze den Secret vom richtigen Stripe-Modus (Test/Live)

**Problem**: User wird nicht freigeschaltet
- **Lösung**: Prüfe die Server-Logs auf Fehler
- **Lösung**: Prüfe, ob die Datenbank-Update funktioniert

## 📝 Checkliste

- [ ] Webhook in Stripe Dashboard erstellt
- [ ] Endpoint URL konfiguriert
- [ ] `checkout.session.completed` Event ausgewählt
- [ ] Webhook Secret kopiert
- [ ] `STRIPE_WEBHOOK_SECRET` in `.env.local` gesetzt
- [ ] Payment Link erfasst E-Mail des Kunden
- [ ] Webhook getestet (Stripe CLI oder Test-Kauf)
- [ ] Server-Logs prüfen

## 🎯 Nächste Schritte

1. **Webhook in Stripe konfigurieren** (siehe oben)
2. **Webhook Secret in `.env.local` setzen**
3. **Test-Kauf durchführen**
4. **Prüfen, ob User freigeschaltet wird**
