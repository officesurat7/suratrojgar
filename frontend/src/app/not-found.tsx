import Link from "next/link";

/** Fallback for URLs outside the public site layout. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">Page not found</h1>
      <Link href="/" className="mt-6 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white">Go to SuratRojgar</Link>
    </main>
  );
}
