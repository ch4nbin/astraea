import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildAssistantReply(params: {
  userMessage: string;
  templateName: string;
  prompt: string;
  recentHistory: ChatMessage[];
}): string {
  const { userMessage, templateName, prompt, recentHistory } = params;
  const lower = userMessage.toLowerCase();

  if (lower.includes("class") || lower.includes("object")) {
    return `For "${templateName}", start by identifying core entities and responsibilities, then define class boundaries. A good first pass is: domain objects -> service layer -> invariants.\n\nPrompt focus:\n${prompt.slice(0, 220)}...`;
  }

  if (lower.includes("api") || lower.includes("endpoint")) {
    return `Map this into API contracts first: resources, endpoints, request/response shapes, and error codes. Then add persistence and validation flows.\n\nTip: write 3 endpoints before coding internals.`;
  }

  if (lower.includes("stuck") || lower.includes("help")) {
    return `You're not stuck, you are at decomposition stage. Try this sequence:\n1) Clarify requirements in one paragraph\n2) Define data model/interfaces\n3) Cover one happy path end-to-end\n4) Add edge cases from constraints\n\nMost recent context: ${recentHistory[recentHistory.length - 1]?.content?.slice(0, 120) ?? "No prior context yet."}`;
  }

  return `Let's walk this step-by-step for "${templateName}".\n- Restate assumptions\n- Choose key abstractions\n- Implement core flow\n- Validate against selected constraints\n\nIf you want, ask me for either a class diagram outline or an API contract draft next.`;
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    sessionId?: string;
    message?: string;
    history?: ChatMessage[];
  };

  if (typeof body.sessionId !== "string" || typeof body.message !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await prisma.session.findFirst({
    where: {
      id: body.sessionId,
      userId,
    },
    include: {
      problemInstances: {
        include: { template: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const activeProblem = session.problemInstances[0];
  if (!activeProblem) {
    return NextResponse.json(
      { error: "No problem instance found for session" },
      { status: 404 },
    );
  }

  const safeHistory = Array.isArray(body.history)
    ? body.history.filter(
        (item) =>
          item &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string",
      )
    : [];

  const reply = buildAssistantReply({
    userMessage: body.message,
    templateName: activeProblem.template.name,
    prompt: activeProblem.generatedPrompt,
    recentHistory: safeHistory.slice(-6),
  });

  return NextResponse.json({
    message: reply,
    context: {
      templateName: activeProblem.template.name,
      problemType: activeProblem.template.type,
    },
  });
}
