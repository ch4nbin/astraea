import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db/prisma";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  if (session.user.id) return session.user.id;
  if (!session.user.email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  return dbUser?.id ?? null;
}
