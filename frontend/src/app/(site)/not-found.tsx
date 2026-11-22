import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-slate-600">This page doesn&apos;t exist, or the job has been filled or removed.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/jobs" className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Browse jobs</Link>
        <Link href="/" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-ink hover:bg-slate-50">Home</Link>
      </div>
    </div>
  );
}
