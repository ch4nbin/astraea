import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db/prisma";
import { StartSessionButton } from "@/components/dashboard/start-session-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      problemInstances: {
        include: {
          template: {
            select: { name: true, type: true },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
      <p className="mt-2 text-neutral-400">
        Signed in as {session?.user?.email ?? "unknown user"}
      </p>
      <div className="mt-8">
        <StartSessionButton />
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-medium text-white">Past Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-neutral-400">No sessions yet. Start your first one.</p>
        ) : (
          <div className="grid gap-3">
            {sessions.map((item) => (
              <Link
                key={item.id}
                href={`/session/${item.id}`}
                className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-700"
              >
                <p className="text-sm text-neutral-300">Session {item.id.slice(0, 8)}</p>
                <p className="mt-1 text-neutral-400">
                  {item.problemInstances[0]?.template.name ?? "Generated problem"} ·{" "}
                  {item.problemInstances[0]?.template.type ?? "Unknown"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
