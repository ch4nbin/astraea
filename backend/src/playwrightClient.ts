import { chromium, type BrowserContext } from "playwright";
import { jsonrepair } from "jsonrepair";
import type { GradeRequest, GradeResult, ProblemRequest, GeneratedProblem, Provider } from "./types.js";

interface AutomationResult {
  rawText: string;
  provider: Provider;
}

const ASTRAEA_JSON_START = "BEGIN_ASTRAEA_JSON";
const ASTRAEA_JSON_END = "END_ASTRAEA_JSON";

export class PlaywrightChatbotClient {
  async generateProblem(request: ProblemRequest): Promise<GeneratedProblem> {
    const prompt = this.buildProblemPrompt(request);
    const result = await this.runAutomation(request.provider, prompt);
    const parsed = this.extractJson(result.rawText);
    return {
      title: parsed.title,
      scenario: parsed.scenario,
      requirements: parsed.requirements,
      constraints: parsed.constraints,
      starterCode: this.sanitizeStarterCode(String(parsed.starterCode ?? ""), request.language),
    };
  }

  async gradeSubmission(request: GradeRequest): Promise<GradeResult> {
    const prompt = this.buildGradingPrompt(request);
    const result = await this.runAutomation(request.provider, prompt);
    const parsed = this.extractJson(result.rawText);
    const normalized = this.normalizeGradeScores(parsed);
    return {
      overall: normalized.overall,
      design: normalized.design,
      correctness: normalized.correctness,
      extensibility: normalized.extensibility,
      clarity: normalized.clarity,
      strengths: parsed.strengths,
      gaps: parsed.gaps,
      nextSteps: parsed.nextSteps,
    };
  }

  private async runAutomation(provider: Provider, prompt: string): Promise<AutomationResult> {
    const enableBrowserAutomation = process.env.ENABLE_BROWSER_AUTOMATION !== "false";
    if (!enableBrowserAutomation) {
      return { provider, rawText: this.mockResponse(prompt) };
    }

    const context = await this.getContext();
    const page = await context.newPage();
    try {
      const providerUrl = provider === "chatgpt" ? "https://chatgpt.com/" : "https://gemini.google.com/";
      await page.goto(providerUrl, { waitUntil: "domcontentloaded" });
      await this.ensureComposerReady(page, provider);
      await this.submitPrompt(page, provider, prompt);
      const responseText = await this.waitForAssistantResponse(page, provider);
      return { provider, rawText: responseText };
    } finally {
      await page.close();
      await context.close();
    }
  }

  private async getContext(): Promise<BrowserContext> {
    const headless = process.env.PLAYWRIGHT_HEADLESS === "true";
    return chromium.launchPersistentContext(".astraea-profile", {
      headless,
      channel: "chrome",
      viewport: { width: 1440, height: 980 },
    });
  }

  private async ensureComposerReady(page: import("playwright").Page, provider: Provider): Promise<void> {
    const selector =
      provider === "chatgpt"
        ? 'textarea#prompt-textarea, textarea[placeholder*="Message"], div[contenteditable="true"][role="textbox"]'
        : 'rich-textarea div[contenteditable="true"], textarea[aria-label*="prompt"], div[contenteditable="true"][role="textbox"]';
    const composer = page.locator(selector).first();
    await composer.waitFor({ timeout: 20000 });
  }

  private async submitPrompt(page: import("playwright").Page, provider: Provider, prompt: string): Promise<void> {
    if (provider === "chatgpt") {
      const textarea = page.locator("textarea#prompt-textarea, textarea[placeholder*='Message']").first();
      if ((await textarea.count()) > 0) {
        await textarea.fill(prompt);
        await textarea.press("Enter");
        return;
      }

      const contentEditable = page.locator('div[contenteditable="true"][role="textbox"]').first();
      await contentEditable.fill(prompt);
      await contentEditable.press("Enter");
      return;
    }

    const geminiEditable = page
      .locator('rich-textarea div[contenteditable="true"], div[contenteditable="true"][role="textbox"]')
      .first();
    await geminiEditable.fill(prompt);
    const sendButton = page
      .locator('button[aria-label*="Send"], button:has-text("Run"), button:has-text("Send")')
      .first();
    if ((await sendButton.count()) > 0) {
      await sendButton.click();
      return;
    }
    await geminiEditable.press("Enter");
  }

  private async waitForAssistantResponse(page: import("playwright").Page, provider: Provider): Promise<string> {
    const candidates =
      provider === "chatgpt"
        ? ['[data-message-author-role="assistant"]', 'article[data-testid^="conversation-turn-"]', "article"]
        : ['message-content, model-response, .response-content', "message-content", "model-response"];

    let bestText = "";
    for (let i = 0; i < 60; i += 1) {
      await page.waitForTimeout(1000);
      const hasStopButton = provider === "chatgpt"
        ? (await page.locator('button:has-text("Stop"), button[aria-label*="Stop"]').count()) > 0
        : (await page.locator('button:has-text("Stop"), button[aria-label*="Stop"], button[aria-label*="Cancel"]').count()) > 0;
      const latest = await this.readLatestAssistantText(page, candidates);
      if (latest.length > bestText.length) bestText = latest;
      if (!hasStopButton && bestText.length > 20 && i > 3) {
        break;
      }
    }

    if (!bestText) {
      throw new Error(
        `No assistant response found for ${provider}. Ensure you are logged in using the .astraea-profile browser profile.`,
      );
    }
    return bestText;
  }

  private async readLatestAssistantText(page: import("playwright").Page, selectors: string[]): Promise<string> {
    for (const selector of selectors) {
      const nodes = page.locator(selector);
      const count = await nodes.count();
      if (count === 0) continue;
      const text = (await nodes.nth(count - 1).innerText()).trim();
      if (text.length > 0) return text;
    }
    return "";
  }

  private extractJson(raw: string): Record<string, any> {
    const start = raw.indexOf(ASTRAEA_JSON_START);
    const end = raw.indexOf(ASTRAEA_JSON_END);
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Model response missing Astraea JSON markers. Raw excerpt: ${raw.slice(0, 180)}`);
    }
    const payload = raw.slice(start + ASTRAEA_JSON_START.length, end).trim();
    try {
      return JSON.parse(payload);
    } catch {
      try {
        return JSON.parse(jsonrepair(payload));
      } catch (repairError) {
        const message = repairError instanceof Error ? repairError.message : "Unknown JSON parse error";
        throw new Error(`Failed to parse model JSON payload: ${message}`);
      }
    }
  }

  private buildProblemPrompt(request: ProblemRequest): string {
    return [
      `Generate an OOD/OOP interview problem for ${request.language}.`,
      `Difficulty: ${request.difficulty}. Domain: ${request.domain}.`,
      "Design scope rules:",
      "- Prefer a cohesive design with limited class separation.",
      "- Use one primary orchestrating class and only essential supporting classes.",
      "- Avoid splitting responsibilities into many tiny classes unless truly required.",
      "Starter code rules:",
      "- Include only class and method signatures.",
      "- Include an __init__ method for each class in Python starter code.",
      "- Do NOT define instance fields (e.g., no self.x / this.x assignments).",
      "- Do NOT include method bodies beyond pass/TODO/raise NotImplementedError.",
      "- Keep starter code minimal and intentionally incomplete.",
      "Output must be only JSON between markers.",
      ASTRAEA_JSON_START,
      JSON.stringify(
        {
          title: "string",
          scenario: "string",
          requirements: ["string"],
          constraints: ["string"],
          starterCode: "string",
        },
        null,
        2,
      ),
      ASTRAEA_JSON_END,
    ].join("\n");
  }

  private buildGradingPrompt(request: GradeRequest): string {
    return [
      "Grade this OOD/OOP solution using balanced interview-style scoring.",
      `Problem: ${request.problem.title}`,
      `Submission:\n${request.submission}`,
      "Scoring guidance:",
      "- Be fair and practical; do not grade as if this is production-hardened code.",
      "- Reward reasonable design decisions even if not perfect.",
      "- Minor style issues should not heavily reduce score.",
      "- Reserve very low scores for fundamentally broken or missing solutions.",
      "- A mostly working, coherent solution should typically land in the 70-85 range.",
      "Output must be only JSON between markers.",
      ASTRAEA_JSON_START,
      JSON.stringify(
        {
          overall: 0,
          design: 0,
          correctness: 0,
          extensibility: 0,
          clarity: 0,
          strengths: ["string"],
          gaps: ["string"],
          nextSteps: ["string"],
        },
        null,
        2,
      ),
      ASTRAEA_JSON_END,
    ].join("\n");
  }

  private normalizeGradeScores(parsed: Record<string, unknown>): {
    overall: number;
    design: number;
    correctness: number;
    extensibility: number;
    clarity: number;
  } {
    const boost = (value: unknown): number => {
      const numeric = typeof value === "number" ? value : Number(value ?? 0);
      if (Number.isNaN(numeric)) return 0;
      // Gentle uplift to reduce harshness while preserving relative ranking.
      const adjusted = Math.round(Math.min(100, numeric * 0.9 + 10));
      return Math.max(0, adjusted);
    };

    const design = boost(parsed.design);
    const correctness = boost(parsed.correctness);
    const extensibility = boost(parsed.extensibility);
    const clarity = boost(parsed.clarity);
    const overall = boost(parsed.overall);

    return { overall, design, correctness, extensibility, clarity };
  }

  private mockResponse(prompt: string): string {
    if (prompt.includes("Grade this OOD/OOP solution")) {
      return [
        ASTRAEA_JSON_START,
        JSON.stringify(
          {
            overall: 76,
            design: 78,
            correctness: 72,
            extensibility: 80,
            clarity: 74,
            strengths: ["Good separation of entities.", "Reasonable method naming."],
            gaps: ["Missing validation on edge cases.", "No clear error handling strategy."],
            nextSteps: ["Add defensive checks.", "Extract policy interfaces for easier extension."],
          },
          null,
          2,
        ),
        ASTRAEA_JSON_END,
      ].join("\n");
    }

    return [
      ASTRAEA_JSON_START,
      JSON.stringify(
        {
          title: "Design a Bank Account Management System",
          scenario:
            "Implement a small banking domain with accounts, transfers, and transaction history under clear object boundaries.",
          requirements: [
            "Support creating checking and savings accounts.",
            "Allow deposit, withdraw, and transfer with validation.",
            "Track transaction history per account.",
            "Model extensible account rules.",
          ],
          constraints: [
            "Use OOP with clear class responsibilities.",
            "Avoid global mutable state.",
            "Design for extension to new account types.",
          ],
          starterCode:
            "class Bank:\n    def create_account(self, account_type: str, owner_id: str):\n        pass\n\n    def deposit(self, account_id: str, amount: float):\n        pass\n\n    def withdraw(self, account_id: str, amount: float):\n        pass\n\n    def transfer(self, from_account_id: str, to_account_id: str, amount: float):\n        pass\n",
        },
        null,
        2,
      ),
      ASTRAEA_JSON_END,
    ].join("\n");
  }

  private sanitizeStarterCode(code: string, language: string): string {
    const raw = code.trim();
    if (!raw) return this.minimalFallbackStarter(language);

    if (language.toLowerCase().includes("python")) {
      return this.sanitizePythonStarter(raw);
    }

    const lines = raw.split("\n");
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;

      // Strip obvious field definitions/assignments to keep starter minimal.
      if (/\bself\.[a-zA-Z_]\w*\s*=/.test(trimmed)) return false;
      if (/\bthis\.[a-zA-Z_]\w*\s*=/.test(trimmed)) return false;
      if (/^[a-zA-Z_]\w*\s*:\s*[^=]+=\s*/.test(trimmed)) return false;
      if (/^(private|public|protected)\s+[a-zA-Z_]\w*\s*[:=]/.test(trimmed)) return false;

      return true;
    });

    const collapsed = filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return collapsed || this.minimalFallbackStarter(language);
  }

  private sanitizePythonStarter(code: string): string {
    const lines = code.split("\n");
    type PyClassBlock = {
      header: string;
      indent: number;
      methods: string[];
      comments: string[];
    };

    const classes: PyClassBlock[] = [];
    let currentClass: PyClassBlock | null = null;

    for (const originalLine of lines) {
      const trimmed = originalLine.trim();
      if (!trimmed) continue;

      const indent = originalLine.length - originalLine.trimStart().length;
      const isClass = /^class\s+[A-Za-z_]\w*(\([^)]*\))?:\s*$/.test(trimmed);
      const isDef = /^def\s+[A-Za-z_]\w*\(.*\)\s*:\s*$/.test(trimmed);

      if (isClass) {
        currentClass = { header: trimmed, indent, methods: [], comments: [] };
        classes.push(currentClass);
        continue;
      }

      if (isDef) {
        if (!currentClass) continue;
        currentClass.methods.push(trimmed);
        continue;
      }

      if (trimmed.startsWith("#")) {
        if (currentClass) currentClass.comments.push(trimmed);
        continue;
      }
    }

    const output: string[] = [];
    const compactClasses = this.reduceClassFragmentation(classes);

    for (const [index, pyClass] of compactClasses.entries()) {
      if (index > 0) output.push("");
      output.push(pyClass.header);

      const baseIndent = " ".repeat(pyClass.indent + 4);
      const methodIndent = " ".repeat(pyClass.indent + 8);
      const uniqueMethods = this.uniquePythonMethods(pyClass.methods);
      const hasInit = uniqueMethods.some((method) => /^def\s+__init__\s*\(/.test(method));

      if (!hasInit) {
        output.push(`${baseIndent}def __init__(self):`);
        output.push(`${methodIndent}# TODO: implement`);
        output.push(`${methodIndent}pass`);
        output.push("");
      }

      for (const method of uniqueMethods) {
        output.push(`${baseIndent}${method}`);
        output.push(`${methodIndent}# TODO: implement`);
        output.push(`${methodIndent}pass`);
        output.push("");
      }
    }

    const collapsed = output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return collapsed || this.minimalFallbackStarter("python");
  }

  private reduceClassFragmentation<T extends { methods: string[] }>(classes: T[]): T[] {
    if (classes.length <= 3) return classes;

    // Soft reduction only:
    // keep classes that have meaningful method surface, and avoid tiny fragments.
    const richer = classes.filter((item) => item.methods.length >= 2);
    if (richer.length >= 3) return richer;

    // If most classes are thin fragments, keep the first richer ones plus the first class.
    const fallback = classes.filter((item, index) => index === 0 || item.methods.length >= 1);
    return fallback.length > 0 ? fallback : classes;
  }

  private uniquePythonMethods(methods: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const rawMethod of methods) {
      const method = this.normalizePythonMethodSignature(rawMethod);
      const match = /^def\s+([A-Za-z_]\w*)\s*\(/.exec(method);
      const key = match ? match[1] : method;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(method);
    }

    return result;
  }

  private normalizePythonMethodSignature(signature: string): string {
    // Gemini sometimes emits constructor as `init` instead of `__init__`.
    if (/^def\s+init\s*\(/.test(signature)) {
      return signature.replace(/^def\s+init\s*\(/, "def __init__(");
    }
    return signature;
  }

  private minimalFallbackStarter(language: string): string {
    if (language.toLowerCase().includes("python")) {
      return [
        "class InterviewDesign:",
        "    def method_one(self):",
        "        pass",
        "",
        "    def method_two(self):",
        "        pass",
      ].join("\n");
    }
    return ["class InterviewDesign {", "  // TODO: add methods", "}"].join("\n");
  }
}
