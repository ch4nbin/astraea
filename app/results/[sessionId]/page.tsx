import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db/prisma";

type ResultsPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const { sessionId } = await params;
  const interviewSession = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
    include: {
      problemInstances: {
        include: {
          template: true,
          submissions: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!interviewSession) redirect("/dashboard");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white">Results</h1>
      <p className="mt-4 text-neutral-300">Session ID: {sessionId}</p>
      <section className="mt-8 space-y-5">
        {interviewSession.problemInstances.map((problem) => (
          <article key={problem.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-sm uppercase tracking-wide text-neutral-400">
              {problem.template.type} · {problem.template.name}
            </p>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-200">
              {problem.generatedPrompt}
            </pre>
            <div className="mt-5 space-y-3">
              <h2 className="text-lg font-medium text-white">Submissions</h2>
              {problem.submissions.length === 0 ? (
                <p className="text-sm text-neutral-400">No submissions yet.</p>
              ) : (
                <div className="space-y-3">
                  {problem.submissions.map((submission) => (
                    <div key={submission.id} className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-4">
                      <p className="text-xs text-neutral-400">
                        {submission.language} · {new Date(submission.createdAt).toLocaleString()}
                      </p>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-neutral-300">
                        {submission.code}
                      </pre>
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-cyan-200">
                        {JSON.stringify(submission.result, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
