# Sinispace v2 - App-Übersicht

## 🎯 **Projekt-Beschreibung**

**Sinispace** ist eine Premium-SaaS-Anwendung für KI-gestützte Produktivitäts-Tools. Die App bietet eine Sammlung von spezialisierten AI-Helfern für Business, Kommunikation, Lifestyle und Content-Erstellung. Kernmerkmal: Jedes Tool ist auf einen spezifischen Use-Case optimiert (nicht nur ein generischer Chat).

---

## 🏗️ **Technologie-Stack**

### **Frontend:**
- **Next.js 16.1.0** (App Router, Server Components, Server Actions)
- **React 19.2.3** (Client Components, Hooks)
- **TypeScript 5**
- **Tailwind CSS 3.4** (Styling)
- **Lucide React** (Icons)
- **Framer Motion** (Animationen)

### **Backend:**
- **Next.js Server Actions** (`'use server'`)
- **NextAuth.js v5** (Authentication)
- **Prisma ORM 5.19** (Database)
- **PostgreSQL** (Datenbank)
- **OpenAI API** (GPT-4o, GPT-4o-mini, Vision API)
- **Stripe** (Payment & Subscriptions)

### **Weitere Libraries:**
- `@react-pdf/renderer` (PDF-Generierung für Rechnungen)
- `react-markdown` (Markdown-Rendering im Chat)
- `react-syntax-highlighter` (Code-Highlighting)
- `nodemailer` (E-Mail-Versand)
- `bcryptjs` (Password-Hashing)

---

## 📁 **Projekt-Struktur**

```
sinispacev2/
├── app/
│   ├── (marketing)/          # Public Pages (Login, Register, Pricing)
│   ├── (platform)/          # Protected Pages (Dashboard, Tools, Chat)
│   │   ├── actions/         # Action-Tools (Email, Invoice, Legal, etc.)
│   │   ├── tools/           # Tool-Pages (Excel, Recipe, Fitness, Travel)
│   │   ├── chat/            # Chat-Interface (SiniChat)
│   │   ├── dashboard/       # Haupt-Dashboard
│   │   ├── settings/        # User-Settings
│   │   └── admin/           # Admin-Panel
│   └── api/                 # API Routes (Auth, Webhooks, Chat-Stream)
├── actions/                 # Server Actions (AI-Logik)
│   ├── ai-actions.ts        # Haupt-AI-Funktionen
│   ├── chat-actions.ts      # Chat-Management
│   ├── auth-actions.ts      # Authentication
│   ├── fitness-ai.ts        # Fit-Coach Backend
│   ├── travel-ai.ts         # Travel-Agent Backend
│   └── ...
├── components/
│   ├── platform/            # Platform-spezifische Components
│   ├── ui/                  # Reusable UI Components
│   └── marketing/           # Marketing Components
├── lib/
│   ├── openai-wrapper.ts    # OpenAI-Integration mit Token-Tracking
│   ├── prisma.ts            # Prisma Client
│   ├── subscription.ts      # Premium-Check-Logik
│   └── ...
└── prisma/
    └── schema.prisma        # Database Schema
```

---

## 🛠️ **Haupt-Features & Tools**

### **1. SiniChat** (`/chat`)
- **Streaming Chat-Interface** mit Typewriter-Effekt
- **Vision API** für Bild-Analyse
- **Dokument-Upload** (PDF, Bilder) für Kontext
- **Chat-Historie** mit persistenter Speicherung
- **Suggested Actions** nach AI-Antworten
- **Touch-Gesten** (Swipe zum Kopieren, Long-Press für Context-Menu)

### **2. Business & Finanzen**

#### **Angebot & Rechnung** (`/actions/invoice`)
- Rechnungen/Angebote mit PDF-Export
- DIN 5008 Form B Format
- Smart Chain → Email-Profi

#### **Rechtstexte & Formales** (`/tools/legal`, `/actions/legal`)
- Rechtssichere Formulierungen
- Verschiedene Modi (Kündigung, Vertrag, AGB, etc.)

#### **Excel-Coach** (`/tools/excel`)
- Formeln erstellen/erklären
- VBA-Makros generieren
- Daten aufräumen
- DE/EN Syntax-Support

### **3. Kommunikation**

#### **Email-Profi** (`/actions/email`)
- Professionelle E-Mails generieren
- Mehrsprachig (DE, EN, FR, etc.)
- Verschiedene Tonfälle
- Smart Chain von Invoice

#### **Chat-Coach** (`/tools/difficult`)
- Schwierige Nachrichten formulieren
- WhatsApp, Dating-Apps, Social Media
- Smart Chain von Recipe (Einkaufsliste)

#### **Sprachbrücke** (`/actions/translate`)
- Kontext-sensible Übersetzungen
- Natürliche Formulierungen

### **4. Text & Optimierung**

#### **Wortschliff** (`/actions/polish`)
- Notizen → professionelle Texte
- Stil & Grammatik-Optimierung

#### **Klartext** (`/actions/summarize`)
- Lange Dokumente zusammenfassen
- Meeting-Notizen komprimieren

### **5. Lifestyle**

#### **Gourmet-Planer** (`/tools/recipe`)
- Rezepte basierend auf vorhandenen Zutaten
- Einkaufsliste mit Mengen
- Smart Chain → Chat-Coach (WhatsApp-Format)

#### **Fit-Coach** (`/tools/fitness`)
- Maßgeschneiderte Trainingspläne
- Filter: Ziel, Level, Equipment, Fokus, Constraints, Energie
- YouTube-Links für Technik-Videos
- Visual Cues ("Kopf-Kino")

#### **Travel-Agent** (`/tools/travel`)
- Komplette Reise-Routen (Itineraries)
- Logistik-optimiert (kein Zick-Zack)
- Google Maps Integration
- Pace-Slider, Saison, Budget, Ernährung
- Extras-Feld für persönliche Wünsche
- Qualitäts-Kontrolle (keine Halluzinationen)

### **6. Job-Beschreibung** (`/actions/job-desc`)
- Stellenanzeigen generieren
- Kultur, Anstellungsart, etc.

---

## 🔐 **Authentication & Subscription**

### **Authentication:**
- **NextAuth.js v5** mit Credentials-Provider
- **Email/Password** Login
- **Session-Management**
- **Password Reset** (Token-basiert)
- **Rate Limiting** (IP-basiert, Login-Versuche)

### **Subscription-System:**
- **Stripe Integration** (Webhooks)
- **Premium-Check** via `subscriptionEnd` (DateTime)
- **Free vs. Premium** Features
- **Upsell-Messages** für Free-User

### **Admin-System:**
- **isAdmin Flag** (User-Model)
- **Admin-Panel** (`/admin`) mit Analytics
- **User-Management**
- **Token-Usage Tracking**
- **Feedback-Dashboard**

---

## 📊 **Datenbank-Schema (Prisma)**

### **Kern-Models:**

1. **User**
   - Authentication (email, password)
   - Subscription (stripeCustomerId, subscriptionEnd)
   - Admin-Flag (isAdmin)
   - Relations: chats, documents, activities, feedbacks, tokenUsages

2. **Chat & Message**
   - Chat-Historie mit Messages
   - Helper-Chats (von Tools generiert)

3. **Document**
   - Uploaded Files (PDF, Bilder)
   - OpenAI File IDs
   - Base64 für Vision API
   - Auto-Expiry (30 Tage)

4. **Analytics:**
   - **UserActivity**: Page Views, Feature Usage
   - **FeatureUsage**: Detaillierte Tool-Nutzung
   - **Feedback**: User-Feedback pro Tool
   - **TokenUsage**: AI-Token-Verbrauch & Kosten-Tracking

5. **Security:**
   - **LoginAttempt**: Rate Limiting
   - **PasswordResetToken**: Token-basiertes Reset

---

## 🎨 **UI/UX-Features**

### **Design-System:**
- **Dark Theme** (Zinc/Gray Palette)
- **Glassmorphism** (Backdrop-Blur)
- **Gradient-Buttons** (Tool-spezifische Farben)
- **Responsive** (Mobile-First)

### **Mobile-Optimierung:**
- **Touch-Gesten** (Swipe, Long-Press)
- **Haptic Feedback**
- **Pull-to-Refresh**
- **Mobile Navigation** (Sidebar mit Overlay)

### **Komponenten:**
- **ToolHeader** (konsistenter Header für alle Tools)
- **CustomSelect** (App-eigene Dropdowns)
- **FeedbackButton** (in jedem Tool)
- **BackButton** (Navigation)
- **WhatIsThisModal** (Tool-Erklärungen)
- **CopyButton** (konsistentes Kopieren)

### **Smart Chains:**
- **Invoice → Email**: Automatische Daten-Übergabe
- **Recipe → Chat-Coach**: Einkaufsliste als WhatsApp-Nachricht
- **Fade-In Animationen**
- **Toast-Notifications**

---

## 🤖 **AI-Integration**

### **OpenAI Wrapper** (`lib/openai-wrapper.ts`):
- **Zentralisiertes Token-Tracking**
- **Usage-Limits** (Premium-Check)
- **Kosten-Schätzung**
- **Model-Auswahl** (gpt-4o, gpt-4o-mini)

### **Chat-Streaming** (`/api/chat/stream`):
- **Word-by-Word Streaming** (Typewriter-Effekt)
- **Vision API** Support
- **Emoji-Encoding** korrekt

### **System Prompts:**
- **Tool-spezifische Prompts** (z.B. "Elite-Personal-Trainer" für Fitness)
- **Anti-Halluzination** (Travel-Agent: Qualitäts-Kontrolle)
- **JSON-Output** für strukturierte Daten

---

## 📈 **Analytics & Tracking**

### **User-Analytics:**
- **Last Login Tracking**
- **Feature Usage** (welches Tool, wie oft)
- **User-spezifische Dashboards**

### **Admin-Analytics:**
- **Global Usage** (Token-Verbrauch, Kosten)
- **Tool-Statistiken**
- **Feedback-Analyse** (Satisfaction Rate)
- **User-Engagement**

### **Usage-Dashboard** (Premium-User):
- **Token-Verbrauch** (Daily/Weekly)
- **Kosten-Tracking** (geschätzt)
- **Warnungen** bei hohem Verbrauch
- **Limits** pro Tool

---

## 🔄 **Workflow & Git**

### **Deployment:**
- **PM2** (Process Manager)
- **Server-Build** Scripts
- **Database Migrations** (Prisma)
- **Backup-System** (vor Änderungen)

### **Git-Workflow:**
- **Main Branch** (Production)
- **Feature Branches** (optional)
- **Tags** für Releases

---

## 🚀 **Wichtige Konzepte**

### **Server Actions:**
- Alle AI-Logik läuft server-side (`'use server'`)
- Form-Submission via `useActionState`
- Premium-Check vor jeder AI-Generierung

### **Client Components:**
- Nur wo nötig (`'use client'`)
- State-Management (useState, useRef)
- Effects (useEffect für Auto-Scroll, etc.)

### **Security:**
- **Input Sanitization**
- **Rate Limiting**
- **Admin-Access-Control**
- **Token-basierte Password-Resets**

### **Performance:**
- **Lazy Loading** (dynamic imports)
- **Streaming** für Chat
- **Optimistic Updates**

---

## 📝 **Nächste Schritte / Offene Punkte**

1. **Route-Struktur vereinheitlichen** (actions/ vs. tools/)
2. **Codefix Tool** (noch nicht implementiert)
3. **Social Media Creator** (noch nicht implementiert)
4. **Conversion-Tracking** (Free → Premium)
5. **Retention-Analyse**

---

## 🎯 **Zielgruppe**

- **Business-Profis** (Rechnungen, E-Mails, Excel)
- **Content-Creator** (Texte polieren, zusammenfassen)
- **Lifestyle-User** (Rezepte, Fitness, Reisen)
- **Kommunikation** (Schwierige Nachrichten, Übersetzungen)

---

## 💡 **Besonderheiten**

- **Kein generischer Chat** - Jedes Tool ist spezialisiert
- **Smart Chains** - Tools arbeiten zusammen
- **Premium-First** - Viele Features nur für Premium
- **Mobile-Optimiert** - Touch-Gesten, Haptics
- **Analytics-Heavy** - Umfangreiches Tracking
- **Qualitäts-Fokus** - Anti-Halluzination (Travel-Agent)

---

**Stand:** Januar 2025
**Version:** 0.1.0
**Status:** Production-Ready
