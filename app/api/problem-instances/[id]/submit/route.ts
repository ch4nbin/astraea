import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { submitPayloadSchema } from "@/lib/validation/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = submitPayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const problemInstance = await prisma.problemInstance.findFirst({
    where: {
      id,
      session: {
        userId,
      },
    },
    select: {
      id: true,
      sessionId: true,
    },
  });

  if (!problemInstance) {
    return NextResponse.json({ error: "Problem instance not found" }, { status: 404 });
  }

  const mockResult = {
    verdict: "PENDING_REVIEW",
    score: 72,
    summary:
      "Stub evaluator: structure looks reasonable. Real execution and rubric scoring are coming in a later milestone.",
    checks: [
      { name: "Requirements coverage", status: "PARTIAL" },
      { name: "Code readability", status: "PASS" },
      { name: "Edge case handling", status: "PARTIAL" },
    ],
  };

  const submission = await prisma.submission.create({
    data: {
      userId,
      sessionId: problemInstance.sessionId,
      problemInstanceId: problemInstance.id,
      language: body.language,
      code: body.code,
      status: "PENDING",
      result: mockResult,
    },
  });

  return NextResponse.json(
    {
      submission,
      result: mockResult,
    },
    { status: 201 },
  );
}
