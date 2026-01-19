import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton Pattern
 * 
 * Performance-Optimierung: Statt 13+ einzelner PrismaClient Instanzen
 * verwenden wir einen globalen Singleton, der in Development mit hot-reload
 * funktioniert und in Production effizient ist.
 * 
 * SICHERHEIT: Unverändert - nur Verbindungs-Pooling optimiert
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
