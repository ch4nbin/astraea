import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { gradeRequestSchema, gradeResultSchema, generatedProblemSchema, problemRequestSchema } from "./schemas.js";
import { PlaywrightChatbotClient } from "./playwrightClient.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const client = new PlaywrightChatbotClient();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "astraea-backend" });
});

app.post("/api/problem/generate", async (req, res) => {
  try {
    const payload = problemRequestSchema.parse(req.body);
    const result = await client.generateProblem(payload);
    const validated = generatedProblemSchema.parse(result);
    res.json(validated);
  } catch (error) {
    handleError(error, res);
  }
});

app.post("/api/problem/grade", async (req, res) => {
  try {
    const payload = gradeRequestSchema.parse(req.body);
    const result = await client.gradeSubmission(payload);
    const validated = gradeResultSchema.parse(result);
    res.json(validated);
  } catch (error) {
    handleError(error, res);
  }
});

app.listen(port, () => {
  console.log(`Astraea backend listening on http://localhost:${port}`);
});

function handleError(error: unknown, res: express.Response): void {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Invalid request payload.", issues: error.issues });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown server error";
  res.status(500).json({ message });
}
