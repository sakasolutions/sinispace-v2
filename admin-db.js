const express = require('express');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const app = express();
const prisma = new PrismaClient();

// Einfaches Passwort (ÄNDERE DAS!)
const ADMIN_PASSWORD = 'admin123'; // WICHTIG: Ändere dieses Passwort!

// Middleware für einfache Authentifizierung
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session-Speicher (in-memory, sehr einfach)
const sessions = new Map();

function requireAuth(req, res, next) {
  const sessionId = req.cookies?.sessionId || req.body.sessionId;
  if (sessions.has(sessionId)) {
    req.session = sessions.get(sessionId);
    return next();
  }
  res.send(`
    <html>
      <head><title>DB Admin Login</title></head>
      <body style="font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>Datenbank Admin Login</h1>
        <form method="POST" action="/login">
          <p>
            <label>Passwort:</label><br>
            <input type="password" name="password" style="width: 300px; padding: 8px;" required>
          </p>
          <button type="submit" style="padding: 10px 20px; background: #0070f3; color: white; border: none; cursor: pointer;">Login</button>
        </form>
      </body>
    </html>
  `);
}

app.post('/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    const sessionId = Math.random().toString(36).substring(7);
    sessions.set(sessionId, { loggedIn: true, time: Date.now() });
    res.cookie('sessionId', sessionId, { httpOnly: true });
    res.redirect('/');
  } else {
    res.send('Falsches Passwort! <a href="/">Zurück</a>');
  }
});

// Route für Tabellen-Übersicht
app.get('/tables', requireAuth, async (req, res) => {
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT 
        tablename, 
        tableowner,
        has_table_privilege('sinispace_user', tablename, 'SELECT') as can_select,
        has_table_privilege('sinispace_user', tablename, 'INSERT') as can_insert,
        has_table_privilege('sinispace_user', tablename, 'UPDATE') as can_update,
        has_table_privilege('sinispace_user', tablename, 'DELETE') as can_delete,
        has_table_privilege('sinispace_user', tablename, 'ALTER') as can_alter
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    res.send(`
      <html>
        <head>
          <title>Tabellen-Übersicht</title>
          <style>
            body { font-family: Arial; max-width: 1400px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; background: white; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #0070f3; color: white; }
            tr:hover { background: #f5f5f5; }
            .yes { color: green; font-weight: bold; }
            .no { color: red; }
            button { padding: 10px 20px; background: #0070f3; color: white; border: none; cursor: pointer; border-radius: 4px; margin-top: 10px; }
            .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <h1>📋 Tabellen-Übersicht</h1>
          <div class="card">
            <p><strong>⚠️ WICHTIG:</strong> Prisma nutzt Großbuchstaben für Tabellennamen: "User", "Account", "Session", "Chat", "Message", "Document"</p>
            <table>
              <tr>
                <th>Tabellenname</th>
                <th>Besitzer</th>
                <th>SELECT</th>
                <th>INSERT</th>
                <th>UPDATE</th>
                <th>DELETE</th>
                <th>ALTER</th>
              </tr>
              ${tables.map(t => `
                <tr>
                  <td><strong>${t.tablename}</strong></td>
                  <td>${t.tableowner}</td>
                  <td class="${t.can_select ? 'yes' : 'no'}">${t.can_select ? '✅' : '❌'}</td>
                  <td class="${t.can_insert ? 'yes' : 'no'}">${t.can_insert ? '✅' : '❌'}</td>
                  <td class="${t.can_update ? 'yes' : 'no'}">${t.can_update ? '✅' : '❌'}</td>
                  <td class="${t.can_delete ? 'yes' : 'no'}">${t.can_delete ? '✅' : '❌'}</td>
                  <td class="${t.can_alter ? 'yes' : 'no'}">${t.can_alter ? '✅' : '❌'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          <a href="/"><button>Zurück zur Hauptseite</button></a>
        </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div style="color: red; padding: 20px;">Fehler: ${error.message}</div><a href="/"><button>Zurück</button></a>`);
  }
});

app.get('/', requireAuth, async (req, res) => {
  try {
    // Datenbank-Info
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();
    const chatCount = await prisma.chat.count();
    const messageCount = await prisma.message.count();
    const documentCount = await prisma.document.count();
    
    // Letzte User
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        subscriptionEnd: true,
      },
    });
    
    // Aktive Sessions
    const activeSessions = await prisma.session.findMany({
      take: 20,
      where: {
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    
    res.send(`
      <html>
        <head>
          <title>DB Admin</title>
          <style>
            body { font-family: Arial; max-width: 1200px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
            .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f0f0f0; }
            .stats { display: flex; gap: 20px; }
            .stat { background: #0070f3; color: white; padding: 20px; border-radius: 8px; }
            .stat h3 { margin: 0; font-size: 32px; }
            .stat p { margin: 5px 0 0 0; }
            .query-box { width: 100%; min-height: 100px; font-family: monospace; padding: 10px; }
            button { padding: 10px 20px; background: #0070f3; color: white; border: none; cursor: pointer; border-radius: 4px; }
            button:hover { background: #0051cc; }
            .error { background: #ff4444; color: white; padding: 10px; border-radius: 4px; margin: 10px 0; }
            .success { background: #44ff44; color: black; padding: 10px; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>📊 Datenbank Admin</h1>
          
          <div class="stats">
            <div class="stat">
              <h3>${userCount}</h3>
              <p>User</p>
            </div>
            <div class="stat">
              <h3>${sessionCount}</h3>
              <p>Sessions</p>
            </div>
            <div class="stat">
              <h3>${chatCount}</h3>
              <p>Chats</p>
            </div>
            <div class="stat">
              <h3>${messageCount}</h3>
              <p>Messages</p>
            </div>
            <div class="stat">
              <h3>${documentCount}</h3>
              <p>Documents</p>
            </div>
          </div>
          
          <div class="card">
            <h2>📋 Tabellen-Übersicht & Rechte</h2>
            <p>Zeige alle Tabellen und ihre Berechtigungen</p>
            <a href="/tables"><button>Tabellen anzeigen</button></a>
          </div>
          
          <div class="card">
            <h2>🔍 SQL Query ausführen (VOLLE KONTROLLE)</h2>
            <p style="color: #ff4444; font-weight: bold;">⚠️ ACHTUNG: Alle SQL-Befehle sind erlaubt (SELECT, INSERT, UPDATE, DELETE, ALTER, etc.)</p>
            <p style="color: #ff8800; font-weight: bold;">💡 WICHTIG: Prisma nutzt Großbuchstaben! Nutze: "User", "Account", "Session", "Chat", "Message", "Document"</p>
            <form method="POST" action="/query">
              <textarea name="query" class="query-box" placeholder="-- Beispiele:&#10;SELECT * FROM &quot;User&quot; LIMIT 10;&#10;UPDATE &quot;User&quot; SET &quot;subscriptionEnd&quot; = '2025-12-31' WHERE email = 'user@example.com';&#10;SELECT * FROM &quot;Chat&quot; WHERE &quot;userId&quot; = '...';&#10;DELETE FROM &quot;Session&quot; WHERE expires < NOW();"></textarea><br>
              <button type="submit" style="background: #ff4444;">Query ausführen</button>
            </form>
            <div style="margin-top: 15px; padding: 15px; background: #f0f0f0; border-radius: 4px;">
              <h3 style="margin-top: 0;">💡 Häufige Queries:</h3>
              <ul style="font-family: monospace; font-size: 12px;">
                <li><strong>User Premium setzen:</strong> UPDATE "User" SET "subscriptionEnd" = '2025-12-31' WHERE email = 'user@example.com';</li>
                <li><strong>Alle User anzeigen:</strong> SELECT id, email, "subscriptionEnd" FROM "User" ORDER BY "createdAt" DESC;</li>
                <li><strong>Chats eines Users:</strong> SELECT * FROM "Chat" WHERE "userId" = 'USER_ID_HIER';</li>
                <li><strong>Alte Sessions löschen:</strong> DELETE FROM "Session" WHERE expires < NOW();</li>
                <li><strong>Spalte hinzufügen:</strong> ALTER TABLE "Chat" ADD COLUMN "isArchived" BOOLEAN DEFAULT false;</li>
              </ul>
            </div>
          </div>
          
          <div class="card">
            <h2>👥 Letzte User</h2>
            <table>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Erstellt</th>
                <th>Premium bis</th>
              </tr>
              ${recentUsers.map(u => `
                <tr>
                  <td>${u.id.substring(0, 20)}...</td>
                  <td>${u.email || 'N/A'}</td>
                  <td>${u.createdAt.toLocaleString('de-DE')}</td>
                  <td>${u.subscriptionEnd ? u.subscriptionEnd.toLocaleDateString('de-DE') : 'Nein'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div class="card">
            <h2>🔐 Aktive Sessions</h2>
            <table>
              <tr>
                <th>User</th>
                <th>Session ID</th>
                <th>Erstellt</th>
                <th>Läuft ab</th>
              </tr>
              ${activeSessions.map(s => `
                <tr>
                  <td>${s.user?.email || 'N/A'}</td>
                  <td>${s.id.substring(0, 20)}...</td>
                  <td>${s.createdAt.toLocaleString('de-DE')}</td>
                  <td>${s.expires.toLocaleString('de-DE')}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.send(`<div class="error">Fehler: ${error.message}</div>`);
  }
});

app.post('/query', requireAuth, async (req, res) => {
  try {
    const query = req.body.query;
    if (!query) {
      return res.send('<div class="error">Keine Query angegeben!</div>');
    }
    
    // WICHTIG: Alle Queries erlauben (SELECT, INSERT, UPDATE, DELETE, ALTER, etc.)
    // Der User hat sich authentifiziert und möchte volle Kontrolle
    
    // Prüfe ob es eine SELECT Query ist (für Ergebnis-Anzeige)
    const isSelect = query.trim().toUpperCase().startsWith('SELECT');
    
    if (isSelect) {
      // SELECT Query - zeige Ergebnis
      const result = await prisma.$queryRawUnsafe(query);
      
      res.send(`
        <html>
          <head>
            <title>Query Result</title>
            <style>
              body { font-family: Arial; padding: 20px; background: #f5f5f5; }
              .success { background: #44ff44; color: black; padding: 10px; border-radius: 4px; margin: 10px 0; }
              pre { background: white; padding: 20px; border-radius: 4px; overflow-x: auto; }
              button { padding: 10px 20px; background: #0070f3; color: white; border: none; cursor: pointer; border-radius: 4px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h2>✅ Query erfolgreich ausgeführt</h2>
            <div class="success">SELECT Query - ${Array.isArray(result) ? result.length : 1} Zeile(n) gefunden</div>
            <pre>${JSON.stringify(result, null, 2)}</pre>
            <a href="/"><button>Zurück</button></a>
          </body>
        </html>
      `);
    } else {
      // INSERT, UPDATE, DELETE, ALTER, etc. - führe aus und zeige Anzahl betroffener Zeilen
      const result = await prisma.$executeRawUnsafe(query);
      
      res.send(`
        <html>
          <head>
            <title>Query Result</title>
            <style>
              body { font-family: Arial; padding: 20px; background: #f5f5f5; }
              .success { background: #44ff44; color: black; padding: 10px; border-radius: 4px; margin: 10px 0; }
              .warning { background: #ffaa00; color: black; padding: 10px; border-radius: 4px; margin: 10px 0; }
              button { padding: 10px 20px; background: #0070f3; color: white; border: none; cursor: pointer; border-radius: 4px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h2>✅ Query erfolgreich ausgeführt</h2>
            <div class="success">${result} Zeile(n) betroffen</div>
            <div class="warning">⚠️ ACHTUNG: Die Datenbank wurde geändert!</div>
            <a href="/"><button>Zurück</button></a>
          </body>
        </html>
      `);
    }
  } catch (error) {
    res.send(`
      <html>
        <head>
          <title>Query Error</title>
          <style>
            body { font-family: Arial; padding: 20px; background: #f5f5f5; }
            .error { background: #ff4444; color: white; padding: 10px; border-radius: 4px; margin: 10px 0; }
            button { padding: 10px 20px; background: #0070f3; color: white; border: none; cursor: pointer; border-radius: 4px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h2>❌ Query Fehler</h2>
          <div class="error">${error.message}</div>
          <a href="/"><button>Zurück</button></a>
        </body>
      </html>
    `);
  }
});

const PORT = process.env.ADMIN_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔐 DB Admin läuft auf Port ${PORT}`);
  console.log(`📊 Öffne: http://localhost:${PORT}`);
  console.log(`⚠️  Passwort: ${ADMIN_PASSWORD} (ÄNDERE DAS!)`);
});
