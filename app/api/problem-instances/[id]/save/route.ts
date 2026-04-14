import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    javascript?: string;
    python?: string;
    activeLanguage?: "JAVASCRIPT" | "PYTHON";
  };

  if (
    typeof body.javascript !== "string" ||
    typeof body.python !== "string" ||
    (body.activeLanguage !== "JAVASCRIPT" && body.activeLanguage !== "PYTHON")
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const instance = await prisma.problemInstance.findFirst({
    where: {
      id,
      session: { userId },
    },
    select: { id: true },
  });

  if (!instance) {
    return NextResponse.json({ error: "Problem instance not found" }, { status: 404 });
  }

  await prisma.problemInstance.update({
    where: { id },
    data: {
      savedCode: {
        javascript: body.javascript,
        python: body.python,
        activeLanguage: body.activeLanguage,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
