import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { generateProblemFromTemplates } from "@/lib/generator/problem-generator";
import { ProblemTemplateInput } from "@/lib/generator/types";

function toGeneratorInput(template: {
  id: string;
  name: string;
  type: "OOD" | "API" | "SYSTEM_DESIGN";
  basePrompt: string;
  variants: string[];
}): ProblemTemplateInput {
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    basePrompt: template.basePrompt,
    variants: template.variants,
  };
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      problemInstances: {
        include: {
          template: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ sessions });
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.problemTemplate.findMany();
  if (templates.length === 0) {
    return NextResponse.json(
      { error: "No problem templates available. Run prisma seed first." },
      { status: 400 },
    );
  }

  const generated = generateProblemFromTemplates(templates.map(toGeneratorInput));

  const createdSession = await prisma.session.create({
    data: {
      userId,
      problemInstances: {
        create: {
          templateId: generated.templateId,
          generatedPrompt: generated.finalPrompt,
          selectedVariants: generated.selectedVariants,
          generationParams: {
            templateName: generated.templateName,
            selectedVariantsCount: generated.selectedVariants.length,
          },
          savedCode: {
            javascript: "",
            python: "",
            activeLanguage: "JAVASCRIPT",
          },
        },
      },
    },
    include: {
      problemInstances: {
        include: {
          template: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ session: createdSession }, { status: 201 });
}
