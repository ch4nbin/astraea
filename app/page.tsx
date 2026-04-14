import Link from "next/link";

const milestones = [
  "Google authentication",
  "Session + problem generation",
  "Monaco editor and code persistence",
  "Submission API (mock execution)",
  "Results page and chatbot assistant",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Astraea</p>
      <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">
        Interview preparation for object-oriented design and API interviews
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-neutral-300">
        Foundation milestone is ready. Next, we will wire authentication, data models,
        and interview session flows step by step.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {milestones.map((item) => (
          <div key={item} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-200">{item}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex gap-4">
        <Link
          href="/signin"
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-900"
        >
          Sign In
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          Dashboard (next milestone)
        </Link>
      </div>
    </main>
  );
}
