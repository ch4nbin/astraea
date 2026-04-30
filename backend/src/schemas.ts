import { z } from "zod";

export const problemRequestSchema = z.object({
  provider: z.enum(["chatgpt", "gemini"]),
  language: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  domain: z.string().min(1),
});

export const generatedProblemSchema = z.object({
  title: z.string().min(1),
  scenario: z.string().min(1),
  requirements: z.array(z.string().min(1)).min(1),
  constraints: z.array(z.string().min(1)).min(1),
  starterCode: z.string().min(1),
});

export const gradeRequestSchema = z.object({
  provider: z.enum(["chatgpt", "gemini"]),
  problem: generatedProblemSchema,
  submission: z.string().min(1),
});

export const gradeResultSchema = z.object({
  overall: z.number().min(0).max(100),
  design: z.number().min(0).max(100),
  correctness: z.number().min(0).max(100),
  extensibility: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  nextSteps: z.array(z.string()),
});
