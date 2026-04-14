export type ProblemType = "OOD" | "API" | "SYSTEM_DESIGN";

export type ProblemTemplateInput = {
  id: string;
  name: string;
  type: ProblemType;
  basePrompt: string;
  variants: string[];
};

export type GeneratedProblem = {
  templateId: string;
  templateName: string;
  selectedVariants: string[];
  finalPrompt: string;
};
