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
    // WICHTIG: req.auth kann existieren auch wenn user undefined ist (ungültige Session)
    // Deshalb explizit prüfen: req.auth?.user muss existieren UND user.id muss existieren
    const hasValidSession = req.auth?.user && req.auth?.user?.id;
    // Nur wenn wirklich eingeloggt (gültige Session) → Redirect zu Dashboard
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Sonst: Login-Seite IMMER erlauben (auch wenn req.auth existiert aber user undefined)
    // Dies verhindert "zu oft umgeleitet" Fehler bei ungültigen Sessions
    return NextResponse.next();
  }

  // WICHTIG: Prüfe explizit ob user existiert UND user.id existiert
  // Wenn Session revoked wurde, existiert req.auth, aber req.auth.user ist undefined
  // Wenn req.auth.user undefined ist, ist die Session ungültig → nicht eingeloggt
  const isAuthenticated = !!(req.auth?.user && req.auth?.user?.id);

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

