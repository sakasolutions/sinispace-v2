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
    // Prüfe ob user.id existiert UND user nicht null ist
    // Wenn user null ist → Session wurde im session() Callback invalidiert → Login erlauben
    // Wenn user.id fehlt → Session ungültig → Login erlauben
    const hasUserId = !!req.auth?.user?.id;
    const userIsNull = req.auth?.user === null;
    const hasValidSession = hasUserId && !userIsNull;
    
    // WICHTIG: Wenn ungültige Session (user == null ODER user.id fehlt)
    // → Cookie löschen und Login-Seite erlauben (KEIN Redirect zu Dashboard!)
    if (userIsNull || !hasUserId) {
      const response = NextResponse.next();
      // Lösche alle NextAuth Cookies mit allen möglichen Pfaden und Domains
      const cookieNames = [
        "authjs.session-token",
        "__Secure-authjs.session-token",
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
        "__Secure-next-auth.csrf-token",
        "next-auth.csrf-token",
      ];
      
      cookieNames.forEach((name) => {
        // Lösche Cookie mit verschiedenen Pfaden und Domains
        response.cookies.delete(name);
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: "/",
          sameSite: "lax",
        });
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: "/",
          domain: req.nextUrl.hostname,
          sameSite: "lax",
        });
      });
      
      // WICHTIG: Login-Seite IMMER erlauben, auch wenn ungültige Session existiert
      return response;
    }
    
    // Nur wenn wirklich eingeloggt (gültige Session mit user.id UND user nicht null) → Redirect zu Dashboard
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // Sonst: Login-Seite IMMER erlauben
    return NextResponse.next();
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
      // Lösche alle NextAuth Cookies mit allen möglichen Pfaden und Domains
      const cookieNames = [
        "authjs.session-token",
        "__Secure-authjs.session-token",
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
        "__Secure-next-auth.csrf-token",
        "next-auth.csrf-token",
      ];
      
      cookieNames.forEach((name) => {
        // Lösche Cookie mit verschiedenen Pfaden und Domains
        response.cookies.delete(name);
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: "/",
          sameSite: "lax",
        });
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: "/",
          domain: req.nextUrl.hostname,
          sameSite: "lax",
        });
      });
      
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

