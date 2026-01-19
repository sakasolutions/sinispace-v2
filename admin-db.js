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

app.get('/', requireAuth, async (req, res) => {
  try {
    // Datenbank-Info
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();
    const chatCount = await prisma.chat.count();
    
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
          </div>
          
          <div class="card">
            <h2>🔍 SQL Query ausführen (VOLLE KONTROLLE)</h2>
            <p style="color: #ff4444; font-weight: bold;">⚠️ ACHTUNG: Alle SQL-Befehle sind erlaubt (SELECT, INSERT, UPDATE, DELETE, ALTER, etc.)</p>
            <form method="POST" action="/query">
              <textarea name="query" class="query-box" placeholder="SELECT * FROM &quot;User&quot; LIMIT 10;&#10;UPDATE &quot;User&quot; SET email = 'test@example.com' WHERE id = '...';&#10;ALTER TABLE &quot;User&quot; ADD COLUMN test TEXT;"></textarea><br>
              <button type="submit" style="background: #ff4444;">Query ausführen</button>
            </form>
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
