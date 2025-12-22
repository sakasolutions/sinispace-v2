import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Ein Preis. Keine Überraschungen.
          </h1>
          <p className="mt-4 max-w-[600px] text-zinc-500 md:text-xl">
            Wir glauben nicht an versteckte Kosten oder Abo-Fallen.
            Du zahlst für ein Jahr Zugriff. Punkt.
          </p>
        </div>

        <div className="mt-16 flex justify-center">
          {/* PRICING CARD */}
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-zinc-900">
                Jahrespass
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                Einmalzahlung
              </span>
            </div>
            <div className="mt-4 flex items-baseline text-zinc-900">
              <span className="text-5xl font-bold tracking-tight">99,90€</span>
              <span className="ml-1 text-xl font-semibold text-zinc-500">
                /Jahr
              </span>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              Zugang endet automatisch nach 365 Tagen. Keine Kündigung nötig.
            </p>

            <ul className="mt-8 space-y-4 text-sm text-zinc-600">
              <li className="flex items-center gap-3">
                <CheckIcon /> Unbegrenzter Zugriff auf Actions
              </li>
              <li className="flex items-center gap-3">
                <CheckIcon /> Fair Use Chat (GPT-4o / Claude 3.5 Sonnet Level)
              </li>
              <li className="flex items-center gap-3">
                <CheckIcon /> 30-Tage Auto-Löschung der Chats
              </li>
              <li className="flex items-center gap-3">
                <CheckIcon /> Priority Support
              </li>
            </ul>

            <Link
              href="/login?plan=yearly"
              className="mt-8 block w-full rounded-lg bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              Jetzt starten
            </Link>
            <p className="mt-4 text-center text-xs text-zinc-400">
              Zahlung via Stripe (Kreditkarte, Apple Pay, Google Pay).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Kleines Icon Component für die Liste
function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-zinc-900"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}