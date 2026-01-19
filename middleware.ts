import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
    // Prüfe ob wirklich eingeloggt (gültige Session mit user.id)
    // WICHTIG: req.auth kann existieren auch wenn user null/undefined ist (ungültige Session)
    // CRITICAL: Prüfe NUR user.id (nicht user != null), weil NextAuth user als null setzen kann
    // Wenn user.id fehlt ODER null/undefined ist → Session ist ungültig → Login erlauben
    const hasValidSession = !!req.auth?.user?.id; // Nur true wenn user.id existiert und nicht null/undefined
    
    // Nur wenn wirklich eingeloggt (gültige Session mit user.id) → Redirect zu Dashboard
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // WICHTIG: Wenn ungültige Session (req.auth existiert aber user == null)
    // → Cookie löschen, damit User sich neu einloggen kann
    // Das verhindert Blockierung durch ungültiges Cookie
    if (req.auth && !req.auth.user) {
      // Ungültige Session erkannt → Cookie löschen
      const response = NextResponse.next();
      // Lösche NextAuth Cookie (Name kann variieren, aber meist "authjs.session-token" oder "next-auth.session-token")
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("__Secure-authjs.session-token");
      response.cookies.delete("next-auth.session-token");
      response.cookies.delete("__Secure-next-auth.session-token");
      return response;
    }
    
    // Sonst: Login-Seite IMMER erlauben (auch wenn req.auth existiert aber user.id fehlt)
    // Dies verhindert "ERR_TOO_MANY_REDIRECTS" bei ungültigen Sessions
    // WICHTIG: Kein Redirect, einfach durchlassen → User kann sich einloggen
    return NextResponse.next();
  }

  // WICHTIG: Prüfe explizit ob user.id existiert (nicht nur user != null)
  // Wenn Session revoked wurde, existiert req.auth, aber req.auth.user ist null ODER user.id fehlt
  // CRITICAL: Prüfe NUR user.id → wenn fehlt/null → Session ungültig → nicht eingeloggt
  const isAuthenticated = !!req.auth?.user?.id; // Nur true wenn user.id existiert und nicht null/undefined

  // WICHTIG: Wenn ungültige Session erkannt (req.auth existiert aber user == null)
  // → Cookie löschen, damit User sich neu einloggen kann
  // Das verhindert Blockierung durch ungültiges Cookie
  if (req.auth && !req.auth.user) {
    // Ungültige Session erkannt → Cookie löschen
    const loginUrl = new URL("/login", req.url);
    const response = NextResponse.redirect(loginUrl);
    // Lösche NextAuth Cookie (Name kann variieren, aber meist "authjs.session-token" oder "next-auth.session-token")
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
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

