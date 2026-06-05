import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-3xl border bg-white p-8 text-center shadow-soft">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you opened does not exist.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
