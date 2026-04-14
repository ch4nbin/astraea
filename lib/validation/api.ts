import { z } from "zod";

export const saveCodePayloadSchema = z.object({
  javascript: z.string().max(200000),
  python: z.string().max(200000),
  activeLanguage: z.enum(["JAVASCRIPT", "PYTHON"]),
});

export const submitPayloadSchema = z.object({
  language: z.enum(["JAVASCRIPT", "PYTHON"]),
  code: z.string().min(1).max(200000),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(5000),
});

export const chatPayloadSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(5000),
  history: z.array(chatMessageSchema).optional().default([]),
});
