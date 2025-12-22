import { loginUser } from '@/actions/auth-actions';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4">
      {/* Zurück-Button */}
      <Link
        href="/"
        className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Zurück
      </Link>

      <div className="w-full max-w-sm space-y-6 rounded-lg border border-zinc-200 p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Willkommen zurück</h1>
          <p className="text-sm text-zinc-500">
            Melde dich an, um fortzufahren.
          </p>
        </div>
        
        <form action={loginUser} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="email">
              E-Mail
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              id="email"
              name="email"
              placeholder="name@beispiel.de"
              type="email"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="password">
              Passwort
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          <button
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-8 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
            type="submit"
          >
            Anmelden
          </button>
        </form>
        
        <div className="text-center text-sm text-zinc-500">
          Neu hier?{' '}
          <Link href="/register" className="underline underline-offset-4 hover:text-zinc-900">
            Konto erstellen
          </Link>
        </div>
      </div>
    </div>
  );
}