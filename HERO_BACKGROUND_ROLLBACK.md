# Hero Background - Rückgängigmachen

## 🎨 Was wurde geändert?

Der Hero-Hintergrund (Grid-Pattern + Glows) wurde auf **alle Seiten** angewendet:
- ✅ Platform-Seiten (Dashboard, Settings, etc.)
- ✅ Chat-Seiten
- ✅ Marketing-Seiten (Login, Register, Pricing)

## 🔄 Zurück zum alten Stand

### Option 1: Komplett deaktivieren (Empfohlen)

Öffne: `components/ui/hero-background.tsx`

Ändere Zeile 15:
```typescript
const USE_HERO_BACKGROUND = false; // false = zurück zum alten Stand
```

**Das war's!** Alle Seiten haben dann wieder den einfachen Hintergrund ohne Grid-Pattern.

---

### Option 2: Nur Grid-Pattern, keine Glows

Öffne die Seiten und ändere:
```tsx
<HeroBackground showGlows={false} />
```

---

## 📝 Wo wird der Background verwendet?

1. **Platform Layout**: `components/platform/platform-layout-content.tsx`
2. **Chat Layout**: `components/chat-layout-wrapper.tsx`
3. **Login**: `app/(marketing)/login/page.tsx`
4. **Register**: `app/(marketing)/register/page.tsx`
5. **Pricing**: `app/(marketing)/pricing/page.tsx`

---

## 🎯 Was macht der Hero Background?

- **Grid-Pattern**: Subtiles, dunkles Grid (24x24px)
- **Radial Glows**: Orange & Purple Glows mit Animation (optional)

---

## ✅ Testen

Nach dem Ändern:
```bash
npm run build
```

Falls alles funktioniert, deployen wie gewohnt.
