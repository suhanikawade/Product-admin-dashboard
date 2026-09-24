import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-200/60">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-slate-600">The page you tried to visit does not exist.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-sky-600 px-4 py-2.5 font-medium text-white transition hover:bg-sky-500"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
