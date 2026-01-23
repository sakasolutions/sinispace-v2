import nodemailer from 'nodemailer';

// SMTP-Transporter für IONOS (nur erstellen wenn Konfiguration vorhanden)
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn('[EMAIL] ⚠️ SMTP-Konfiguration unvollständig. E-Mails können nicht gesendet werden.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: true, // true für Port 465 (SSL/TLS)
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

// Teste SMTP-Verbindung (optional, für Debugging)
export async function testEmailConnection() {
  try {
    const transport = getTransporter();
    if (!transport) {
      console.warn('[EMAIL] ⚠️ Kein SMTP-Transporter verfügbar');
      return false;
    }
    await transport.verify();
    console.log('[EMAIL] ✅ SMTP-Verbindung erfolgreich');
    return true;
  } catch (error) {
    console.error('[EMAIL] ❌ SMTP-Verbindung fehlgeschlagen:', error);
    return false;
  }
}

// Passwort-Reset E-Mail senden
export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL || 'https://sinispace.app'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'kontakt@sinispace.app',
    to: email,
    subject: 'Passwort zurücksetzen - SiniSpace',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Passwort zurücksetzen</h2>
            <p>Du hast eine Passwort-Zurücksetzung für dein SiniSpace-Konto angefordert.</p>
            <p>Klicke auf den folgenden Button, um ein neues Passwort festzulegen:</p>
            <a href="${resetUrl}" class="button">Passwort zurücksetzen</a>
            <p>Oder kopiere diesen Link in deinen Browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
            <p><strong>Wichtig:</strong> Dieser Link ist nur 1 Stunde gültig und kann nur einmal verwendet werden.</p>
            <p>Falls du diese E-Mail nicht angefordert hast, kannst du sie einfach ignorieren.</p>
            <div class="footer">
              <p>Mit freundlichen Grüßen,<br>Dein SiniSpace Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Passwort zurücksetzen - SiniSpace
      
      Du hast eine Passwort-Zurücksetzung für dein SiniSpace-Konto angefordert.
      
      Klicke auf den folgenden Link, um ein neues Passwort festzulegen:
      ${resetUrl}
      
      Wichtig: Dieser Link ist nur 1 Stunde gültig und kann nur einmal verwendet werden.
      
      Falls du diese E-Mail nicht angefordert hast, kannst du sie einfach ignorieren.
      
      Mit freundlichen Grüßen,
      Dein SiniSpace Team
    `,
  };

  try {
    const transport = getTransporter();
    if (!transport) {
      const missing = [];
      if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
      if (!process.env.SMTP_PORT) missing.push('SMTP_PORT');
      if (!process.env.SMTP_USER) missing.push('SMTP_USER');
      if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');
      console.error(`[EMAIL] ❌ SMTP nicht konfiguriert. Fehlende Variablen: ${missing.join(', ')}`);
      throw new Error('E-Mail-Service nicht konfiguriert. Bitte kontaktiere den Support.');
    }
    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Passwort-Reset E-Mail gesendet an: ${email}, MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EMAIL] ❌ Fehler beim Senden der E-Mail an ${email}:`, error);
    
    // Spezifischere Fehlermeldungen
    if (error.code === 'EAUTH') {
      console.error('[EMAIL] ❌ Authentifizierung fehlgeschlagen - Prüfe SMTP_USER und SMTP_PASS');
      throw new Error('E-Mail-Authentifizierung fehlgeschlagen. Bitte kontaktiere den Support.');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('[EMAIL] ❌ Verbindungsfehler - Prüfe SMTP_HOST und SMTP_PORT');
      throw new Error('E-Mail-Server nicht erreichbar. Bitte versuche es später erneut.');
    } else if (error.message?.includes('nicht konfiguriert')) {
      throw error; // Bereits spezifische Meldung
    }
    
    throw new Error('Fehler beim Senden der E-Mail. Bitte versuche es später erneut.');
  }
}

// Passwort geändert - Bestätigungs-E-Mail
export async function sendPasswordChangedEmail(email: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'kontakt@sinispace.app',
    to: email,
    subject: 'Passwort geändert - SiniSpace',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Passwort erfolgreich geändert</h2>
            <p>Dein Passwort für dein SiniSpace-Konto wurde erfolgreich geändert.</p>
            <div class="warning">
              <p><strong>⚠️ Sicherheitshinweis:</strong></p>
              <p>Falls du diese Änderung nicht vorgenommen hast, kontaktiere uns bitte umgehend.</p>
            </div>
            <div class="footer">
              <p>Mit freundlichen Grüßen,<br>Dein SiniSpace Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Passwort erfolgreich geändert - SiniSpace
      
      Dein Passwort für dein SiniSpace-Konto wurde erfolgreich geändert.
      
      ⚠️ Sicherheitshinweis:
      Falls du diese Änderung nicht vorgenommen hast, kontaktiere uns bitte umgehend.
      
      Mit freundlichen Grüßen,
      Dein SiniSpace Team
    `,
  };

  try {
    const transport = getTransporter();
    if (!transport) {
      console.warn('[EMAIL] ⚠️ SMTP nicht konfiguriert - Bestätigungs-E-Mail nicht gesendet');
      return { success: false };
    }
    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Passwort-Änderung Bestätigung gesendet an: ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] ❌ Fehler beim Senden der Bestätigungs-E-Mail an ${email}:`, error);
    // Nicht werfen - Bestätigungs-E-Mail ist nicht kritisch
    return { success: false };
  }
}
