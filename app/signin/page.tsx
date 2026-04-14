import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-6">
      <div className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-8">
        <h1 className="text-2xl font-semibold text-white">Sign in to Astraea</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Continue with Google to start interview sessions.
        </p>
        <Link
          href="/api/auth/signin/google"
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          Continue with Google
        </Link>
      </div>
    </main>
  );
}
