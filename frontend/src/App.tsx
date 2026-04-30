import { useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import "./App.css";

type Provider = "chatgpt" | "gemini";
type Difficulty = "easy" | "medium" | "hard";

interface GeneratedProblem {
  title: string;
  scenario: string;
  requirements: string[];
  constraints: string[];
  starterCode: string;
}

interface GradeResult {
  overall: number;
  design: number;
  correctness: number;
  extensibility: number;
  clarity: number;
  strengths: string[];
  gaps: string[];
  nextSteps: string[];
}

const API_BASE_URL = "http://localhost:4000";
const DOMAINS = ["banking", "parking lot", "file sharing", "warehouse", "resource management", "ticketing"];

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [provider, setProvider] = useState<Provider>("gemini");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [language, setLanguage] = useState("Python");
  const [problem, setProblem] = useState<GeneratedProblem | null>(null);
  const [code, setCode] = useState("# Generate a problem to begin.");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [lastDomain, setLastDomain] = useState<string>("random");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const editorExtensions = useMemo(() => getEditorExtensions(language), [language]);

  function pickRandomDomain(): string {
    return DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  }

  async function handleGenerateProblem() {
    try {
      const startedAt = Date.now();
      const randomDomain = pickRandomDomain();
      setLastDomain(randomDomain);
      setStatus("Generating");
      setError(null);
      setGrade(null);
      const response = await fetch(`${API_BASE_URL}/api/problem/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, difficulty, domain: randomDomain, language }),
      });

      if (!response.ok) {
        const text = await response.text();
        let parsedMessage = text;
        try {
          const parsed = JSON.parse(text) as { message?: string };
          parsedMessage = parsed.message ?? text;
        } catch {
          // Keep raw text if not JSON.
        }
        throw new Error(parsedMessage || "Request failed.");
      }

      const nextProblem = (await response.json()) as GeneratedProblem;
      setProblem(nextProblem);
      setCode(nextProblem.starterCode);
      setLatencyMs(Date.now() - startedAt);
      setStatus("Ready");
    } catch (error) {
      setStatus("Failed");
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(`Generate failed: ${message}`);
    }
  }

  async function handleGrade() {
    if (!problem || !code.trim()) return;
    try {
      const startedAt = Date.now();
      setStatus("Grading");
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/problem/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, problem, submission: code }),
      });

      if (!response.ok) {
        const text = await response.text();
        let parsedMessage = text;
        try {
          const parsed = JSON.parse(text) as { message?: string };
          parsedMessage = parsed.message ?? text;
        } catch {
          // Keep raw text if not JSON.
        }
        throw new Error(parsedMessage || "Request failed.");
      }

      const result = (await response.json()) as GradeResult;
      setGrade(result);
      setLatencyMs(Date.now() - startedAt);
      setStatus("Ready");
    } catch (error) {
      setStatus("Failed");
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(`Grade failed: ${message}`);
    }
  }

  return (
    <div className={`app theme-${theme}`}>
      <header className="topbar card">
        <div>
          <h1>Astraea</h1>
          <p className="subtitle">Object design interview lab</p>
        </div>
        <div className="controls">
          <button className="ghost-btn" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Light" : "Dark"} mode
          </button>
          <span className={`status status-${status.toLowerCase()}`}>{status}</span>
        </div>
      </header>

      <section className="toolbar card">
        <div className="field">
          <label>Provider</label>
          <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>
            <option value="chatgpt">ChatGPT</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div className="field">
          <label>Difficulty</label>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="field">
          <label>Language</label>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="Python">Python</option>
            <option value="TypeScript">TypeScript</option>
            <option value="JavaScript">JavaScript</option>
            <option value="Java">Java</option>
            <option value="C++">C++</option>
          </select>
        </div>
        <div className="action-group">
          <button className="primary-btn" type="button" onClick={handleGenerateProblem}>
            New problem
          </button>
          <button className="ghost-btn" type="button" onClick={handleGrade} disabled={!problem}>
            Grade
          </button>
        </div>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <main className="layout">
        <aside className="panel card">
          <div className="panel-header">
            <h2>Problem</h2>
            <span className="pill">Domain: {lastDomain}</span>
          </div>
          {problem ? (
            <>
              <h3>{problem.title}</h3>
              <p>{problem.scenario}</p>
              <h4>Requirements</h4>
              <ul>
                {problem.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h4>Constraints</h4>
              <ul>
                {problem.constraints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>Click New problem to generate a random class design challenge.</p>
          )}
        </aside>

        <section className="editor-panel card">
          <div className="editor-header">
            <span>Code</span>
            <span className="meta-line">{latencyMs ? `${(latencyMs / 1000).toFixed(1)}s last run` : "No runs yet"}</span>
          </div>
          <CodeMirror
            value={code}
            onChange={(value) => setCode(value)}
            extensions={editorExtensions}
            theme={theme === "dark" ? oneDark : "light"}
            height="calc(100% - 34px)"
            basicSetup={{
              foldGutter: false,
              highlightActiveLineGutter: false,
            }}
          />
        </section>

        <aside className="panel card">
          <div className="panel-header">
            <h2>Evaluation</h2>
            {grade ? <span className="pill">Score {grade.overall}</span> : null}
          </div>
          {grade ? (
            <>
              <div className="score-grid">
                <div>
                  <span>Overall</span>
                  <strong>{grade.overall}</strong>
                </div>
                <div>
                  <span>Design</span>
                  <strong>{grade.design}</strong>
                </div>
                <div>
                  <span>Correctness</span>
                  <strong>{grade.correctness}</strong>
                </div>
                <div>
                  <span>Extensibility</span>
                  <strong>{grade.extensibility}</strong>
                </div>
                <div>
                  <span>Clarity</span>
                  <strong>{grade.clarity}</strong>
                </div>
              </div>
              <h4>Strengths</h4>
              <ul>{grade.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
              <h4>Gaps</h4>
              <ul>{grade.gaps.map((item) => <li key={item}>{item}</li>)}</ul>
              <h4>Next steps</h4>
              <ul>{grade.nextSteps.map((item) => <li key={item}>{item}</li>)}</ul>
            </>
          ) : (
            <p>Run Grade to receive rubric feedback.</p>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;

function getEditorExtensions(language: string) {
  switch (language) {
    case "Python":
      return [python()];
    case "JavaScript":
      return [javascript()];
    case "TypeScript":
      return [javascript({ typescript: true })];
    case "Java":
      return [java()];
    case "C++":
      return [cpp()];
    default:
      return [python()];
  }
}
