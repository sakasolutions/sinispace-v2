import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSessionRevoked } from "@/lib/session-cache";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // Statische Assets und Next.js interne Routen erlauben (früh zurückkehren)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // NextAuth API Routes immer erlauben
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // WICHTIG: Login/Register IMMER ZUERST prüfen (bevor andere Checks)
  // Dies verhindert Redirect-Loops bei ungültigen Sessions
  if (pathname === "/login" || pathname === "/register") {
    // NEU: Prüfe Cache für revoked Sessions (Edge Runtime kompatibel, kein Prisma nötig)
    // Bei JWT-Strategy prüfen wir userId aus req.auth (nicht sessionToken aus Cookie)
    const userId = req.auth?.user?.id || null;
    const isRevoked = isSessionRevoked(userId);
    
    // Wenn Session revoked wurde → Cookie löschen → Login IMMER erlauben
    if (isRevoked) {
      const response = NextResponse.next();
      // Lösche alle NextAuth Cookies
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("__Secure-authjs.session-token");
      response.cookies.delete("next-auth.session-token");
      response.cookies.delete("__Secure-next-auth.session-token");
      response.cookies.delete("__Secure-next-auth.csrf-token");
      response.cookies.delete("next-auth.csrf-token");
      return response;
    }
    
    // CRITICAL: Prüfe ob user.id existiert UND user nicht null ist
    // Wenn user null ist → Session wurde im session() Callback invalidiert → Login erlauben
    // Wenn user.id fehlt → Session ungültig → Login erlauben
    const hasUserId = !!req.auth?.user?.id;
    const userIsNull = req.auth?.user === null;
    const hasValidSession = hasUserId && !userIsNull;
    
    // Nur wenn wirklich eingeloggt (gültige Session mit user.id UND user nicht null) → Redirect zu Dashboard
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // WICHTIG: Wenn ungültige Session (user == null ODER user.id fehlt)
    // → Cookie löschen, damit User sich neu einloggen kann
    // Das verhindert Blockierung durch ungültiges Cookie
    if (userIsNull || !hasUserId) {
      // Ungültige Session erkannt → Cookie löschen
      const response = NextResponse.next();
      // Lösche NextAuth Cookie (alle möglichen Varianten)
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("__Secure-authjs.session-token");
      response.cookies.delete("next-auth.session-token");
      response.cookies.delete("__Secure-next-auth.session-token");
      // Lösche auch mögliche JWT-Cookies
      response.cookies.delete("__Secure-next-auth.csrf-token");
      response.cookies.delete("next-auth.csrf-token");
      return response;
    }
    
    // Sonst: Login-Seite IMMER erlauben
    return NextResponse.next();
  }

  // NEU: Prüfe Cache für revoked Sessions (Edge Runtime kompatibel, kein Prisma nötig)
  // Bei JWT-Strategy prüfen wir userId aus req.auth (nicht sessionToken aus Cookie)
  const userId = req.auth?.user?.id || null;
  const isRevoked = isSessionRevoked(userId);
  
  // Wenn Session revoked wurde → Cookie löschen → Redirect zu Login
  if (isRevoked) {
    const loginUrl = new URL("/login", req.url);
    const response = NextResponse.redirect(loginUrl);
    // Lösche alle NextAuth Cookies
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.csrf-token");
    response.cookies.delete("next-auth.csrf-token");
    return response;
  }

  // WICHTIG: Prüfe explizit ob user.id existiert UND user nicht null ist
  // Wenn Session revoked wurde, setzt session() Callback user = null
  // CRITICAL: Nur wenn user.id existiert UND user nicht null → authentifiziert
  const hasUserId = !!req.auth?.user?.id;
  const userIsNull = req.auth?.user === null;
  const isAuthenticated = hasUserId && !userIsNull;

  // WICHTIG: Wenn ungültige Session erkannt (user == null ODER user.id fehlt)
  // → Cookie löschen und zu Login redirecten
  if (userIsNull || !hasUserId) {
    const loginUrl = new URL("/login", req.url);
    const response = NextResponse.redirect(loginUrl);
    // Lösche alle NextAuth Cookies
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.csrf-token");
    response.cookies.delete("next-auth.csrf-token");
    return response;
  }

  // Geschützte Routen
  const protectedRoutes = ["/dashboard", "/chat", "/settings", "/actions"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Wenn geschützte Route und nicht eingeloggt -> Redirect zu Login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    // Callback URL speichern, damit User nach Login zurückkommt
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Alles andere erlauben (öffentliche Routen und unbekannte Routen)
  return NextResponse.next();
});

// Middleware matcher - nur auf relevanten Routen ausführen
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

