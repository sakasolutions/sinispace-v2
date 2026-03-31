import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    isAdmin?: boolean;
  }

  interface Session {
    user: (DefaultSession['user'] & { id: string; isAdmin?: boolean }) | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    email?: string | null;
    isAdmin?: boolean;
  }
}
