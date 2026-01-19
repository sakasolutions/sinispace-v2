import { handlers } from "@/auth";

// WICHTIG: Route Handler muss im Node.js Runtime laufen (nicht Edge)
// Prisma funktioniert nicht im Edge Runtime
export const runtime = 'nodejs';

export const { GET, POST } = handlers;