export type Provider = "chatgpt" | "gemini";

export interface ProblemRequest {
  provider: Provider;
  language: string;
  difficulty: "easy" | "medium" | "hard";
  domain: string;
}

export interface GeneratedProblem {
  title: string;
  scenario: string;
  requirements: string[];
  constraints: string[];
  starterCode: string;
}

export interface GradeRequest {
  provider: Provider;
  problem: GeneratedProblem;
  submission: string;
}

export interface GradeResult {
  overall: number;
  design: number;
  correctness: number;
  extensibility: number;
  clarity: number;
  strengths: string[];
  gaps: string[];
  nextSteps: string[];
}
