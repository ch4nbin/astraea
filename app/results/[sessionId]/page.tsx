import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

type ResultsPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const { sessionId } = await params;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white">Results</h1>
      <p className="mt-4 text-neutral-300">Session ID: {sessionId}</p>
      <p className="mt-2 text-neutral-400">
        Prompt, submissions, and mock evaluations will be shown here.
      </p>
    </main>
  );
}
