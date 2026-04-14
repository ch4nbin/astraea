import { GeneratedProblem, ProblemTemplateInput } from "@/lib/generator/types";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function generateProblemFromTemplates(
  templates: ProblemTemplateInput[],
): GeneratedProblem {
  if (templates.length === 0) {
    throw new Error("No problem templates provided");
  }

  const template = templates[randomInt(0, templates.length - 1)];
  const variantCount = Math.min(randomInt(1, 3), template.variants.length);
  const selectedVariants = shuffled(template.variants).slice(0, variantCount);
  const finalPrompt = `${template.basePrompt}\n\nConstraints:\n${selectedVariants
    .map((variant, index) => `${index + 1}. ${variant}`)
    .join("\n")}`;

  return {
    templateId: template.id,
    templateName: template.name,
    selectedVariants,
    finalPrompt,
  };
}
