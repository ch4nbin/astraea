import Link from "next/link";

const pillars = [
  {
    title: "Template-Based Problem Generator",
    description:
      "Practice OOD, API, and system design prompts generated from curated templates with randomized constraints.",
  },
  {
    title: "Session Playback",
    description:
      "Every session stores the exact generated prompt, selected variants, and your code history for review.",
  },
  {
    title: "In-Browser Coding",
    description:
      "Switch between JavaScript and Python while solving interview prompts in a clean coding workspace.",
  },
  {
    title: "Guided Chat Assistant",
    description:
      "Open the built-in assistant any time to get coaching hints, design feedback, and structured nudges.",
  },
];

const workflow = [
  "Sign in with Google and start a fresh interview session.",
  "Receive a generated prompt from seeded OOD/API/system design templates.",
  "Write and refine your solution in-editor with language switching support.",
  "Submit and review your stored attempts, prompts, and feedback path.",
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col justify-center px-6 py-20">
        <p className="inline-flex w-fit rounded-full border border-neutral-700 bg-neutral-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-300">
          Astraea Interview Platform
        </p>
        <h1 className="mt-6 max-w-4xl text-balance text-5xl font-semibold leading-tight text-white md:text-7xl">
          Practice object-oriented design and API interviews like real rounds.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-neutral-300">
          Structured prompts, stored sessions, guided coding, and reviewable submissions.
          Built for engineers preparing for system-heavy technical interviews.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/signin"
            className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-neutral-700 bg-neutral-900/60 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Open Dashboard
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-8">
        <div className="grid gap-4 md:grid-cols-2">
          {pillars.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-6 backdrop-blur"
            >
              <h3 className="text-lg font-medium text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-300">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/80 p-8 md:p-12">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
            A focused workflow for interview preparation
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {workflow.map((step, index) => (
              <div key={step} className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
                <p className="text-xs text-cyan-300">Step {index + 1}</p>
                <p className="mt-2 text-sm text-neutral-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-neutral-950 to-indigo-500/10 p-8 md:p-12">
          <h2 className="max-w-2xl text-3xl font-semibold text-white md:text-4xl">
            Ready to prepare like a production interview?
          </h2>
          <p className="mt-4 max-w-2xl text-neutral-300">
            Start a session, tackle generated constraints, and improve with repeatable,
            trackable practice.
          </p>
          <div className="mt-8">
            <Link
              href="/signin"
              className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              Start First Session
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
