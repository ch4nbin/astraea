import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db/prisma";
import { ProblemEditor } from "@/components/editor/problem-editor";
import { normalizeSavedCode } from "@/lib/problem/saved-code";

type SessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const { id } = await params;
  const interviewSession = await prisma.session.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      problemInstances: {
        include: {
          template: true,
        },
      },
    },
  });
  if (!interviewSession) redirect("/dashboard");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white">Interview Session</h1>
      <p className="mt-4 text-neutral-300">Session ID: {id}</p>
      <section className="mt-8 space-y-4">
        {interviewSession.problemInstances.map((problem) => (
          <article key={problem.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-sm uppercase tracking-wide text-neutral-400">
              {problem.template.type} · {problem.template.name}
            </p>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-200">
              {problem.generatedPrompt}
            </pre>
            <div className="mt-4">
              <ProblemEditor
                problemInstanceId={problem.id}
                initialCode={normalizeSavedCode(problem.savedCode)}
                sessionId={interviewSession.id}
              />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
