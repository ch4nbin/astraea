import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import "./App.css";

type Provider = "chatgpt" | "gemini";
type Difficulty = "easy" | "medium" | "hard";
type View = "landing" | "auth" | "app";
type AppSection = "dashboard" | "ide" | "friends" | "sessions";

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

interface User {
  id: string;
  username: string;
  createdAt: string;
}

interface SavedSession {
  id: string;
  problemTitle: string;
  language: string;
  difficulty: string;
  provider: string;
  domain: string;
  score: number | null;
  createdAt: string;
  problem: GeneratedProblem | null;
  submission: string;
  grade: GradeResult | null;
}

interface IncomingRequest {
  id: string;
  fromUser: User;
  createdAt: string;
}

interface FriendActivity {
  id: string;
  message: string;
  createdAt: string;
}

const API_BASE_URL = "http://localhost:4000";
const DOMAINS = ["banking", "parking lot", "file sharing", "warehouse", "resource management", "ticketing"];
const AUTH_TOKEN_KEY = "astraea.auth.token";

function App() {
  const [view, setView] = useState<View>("landing");
  const [section, setSection] = useState<AppSection>("dashboard");
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
  const [token, setToken] = useState<string>(localStorage.getItem(AUTH_TOKEN_KEY) ?? "");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friendUsername, setFriendUsername] = useState("");
  const [friends, setFriends] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [friendActivity, setFriendActivity] = useState<FriendActivity[]>([]);
  const [socialStatus, setSocialStatus] = useState<string | null>(null);

  const editorExtensions = useMemo(() => getEditorExtensions(language), [language]);

  useEffect(() => {
    void bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    void refreshSocialData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
    } catch (submitError) {
      setStatus("Failed");
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
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
    } catch (submitError) {
      setStatus("Failed");
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(`Grade failed: ${message}`);
    }
  }

  async function bootstrapAuth() {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedToken) return;
    try {
      const meResponse = await apiFetch("/api/me", "GET", undefined, storedToken);
      setToken(storedToken);
      setCurrentUser(meResponse.user as User);
      setView("app");
      setSection("dashboard");
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setToken("");
      setCurrentUser(null);
      setView("landing");
    }
  }

  async function handleAuthSubmit() {
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await apiFetch(endpoint, "POST", { username: usernameInput, password: passwordInput });
      const nextToken = String(response.token ?? "");
      if (!nextToken) throw new Error("Missing auth token.");
      setToken(nextToken);
      setCurrentUser(response.user as User);
      setUsernameInput("");
      setPasswordInput("");
      setSocialStatus(authMode === "login" ? "Logged in." : "Account created.");
      setView("app");
      setSection("dashboard");
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Auth failed";
      setSocialStatus(message);
    }
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken("");
    setCurrentUser(null);
    setFriends([]);
    setIncomingRequests([]);
    setSavedSessions([]);
    setFriendActivity([]);
    setSocialStatus("Logged out.");
    setView("landing");
    setSection("dashboard");
  }

  async function refreshSocialData(authToken: string = token) {
    if (!authToken) return;
    try {
      const [me, friendPayload, sessionsPayload, activityPayload] = await Promise.all([
        apiFetch("/api/me", "GET", undefined, authToken),
        apiFetch("/api/friends", "GET", undefined, authToken),
        apiFetch("/api/sessions/mine", "GET", undefined, authToken),
        apiFetch("/api/activity/friends", "GET", undefined, authToken),
      ]);
      setCurrentUser(me.user as User);
      setFriends((friendPayload.friends as User[]) ?? []);
      setIncomingRequests((friendPayload.incomingRequests as IncomingRequest[]) ?? []);
      setSavedSessions((sessionsPayload.sessions as SavedSession[]) ?? []);
      setFriendActivity((activityPayload.activity as FriendActivity[]) ?? []);
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "Failed to refresh social data.";
      setSocialStatus(message);
    }
  }

  async function handleSendFriendRequest() {
    if (!friendUsername.trim()) return;
    try {
      await apiFetch("/api/friends/request", "POST", { username: friendUsername }, token);
      setFriendUsername("");
      setSocialStatus("Friend request sent.");
      await refreshSocialData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to send request.";
      setSocialStatus(message);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    try {
      await apiFetch("/api/friends/accept", "POST", { requestId }, token);
      setSocialStatus("Friend request accepted.");
      await refreshSocialData();
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : "Failed to accept request.";
      setSocialStatus(message);
    }
  }

  async function handleSaveSession() {
    if (!problem) {
      setSocialStatus("Generate a problem before saving session.");
      return;
    }
    if (!token) {
      setSocialStatus("Login required to save sessions.");
      return;
    }
    try {
      await apiFetch(
        "/api/sessions/save",
        "POST",
        {
          provider,
          language,
          difficulty,
          domain: lastDomain,
          problem,
          submission: code,
          grade,
        },
        token,
      );
      setSocialStatus("Session saved.");
      await refreshSocialData();
      setSection("dashboard");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save session.";
      setSocialStatus(message);
    }
  }

  function handleOpenSavedSession(session: SavedSession) {
    if (session.problem) {
      setProblem(session.problem);
    }
    setCode(session.submission ?? "");
    setGrade(session.grade ?? null);
    setLanguage(session.language || "Python");
    setDifficulty((session.difficulty as Difficulty) || "medium");
    setProvider((session.provider as Provider) || "gemini");
    setLastDomain(session.domain || "random");
    setSection("ide");
    setSocialStatus(`Loaded session: ${session.problemTitle}`);
  }

  async function handleDeleteSavedSession(sessionId: string) {
    try {
      await apiFetch(`/api/sessions/${sessionId}`, "DELETE", undefined, token);
      await refreshSocialData();
      setSocialStatus("Session deleted.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete session.";
      setSocialStatus(message);
    }
  }

  function goToAuth() {
    setView("auth");
  }

  function goToApp() {
    if (!token) {
      setView("auth");
      return;
    }
    setView("app");
    setSection("dashboard");
  }

  if (view === "landing") {
    return (
      <div className={`app-shell theme-${theme}`}>
        <section className="landing">
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />
          <div className="landing-card">
            <span className="eyebrow">ASTRAEA</span>
            <h1>Design interview practice without the clutter.</h1>
            <p>Generate realistic system design problems, code your solution, and get instant rubric feedback in one focused workspace.</p>
            <div className="landing-actions">
              <button className="primary-btn" type="button" onClick={goToAuth}>
                Get started
              </button>
              <button className="ghost-btn" type="button" onClick={goToApp}>
                Continue to app
              </button>
              <button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? "Light" : "Dark"} mode
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (view === "auth") {
    return (
      <div className={`app-shell theme-${theme}`}>
        <section className="auth-page">
          <article className="auth-card card">
            <div className="panel-header">
              <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
              <button className="link-btn" type="button" onClick={() => setView("landing")}>
                Back
              </button>
            </div>
            <p className="subtitle">Sign in to save sessions, track progress, and collaborate with friends.</p>
            <div className="field">
              <label>Username</label>
              <input value={usernameInput} onChange={(event) => setUsernameInput(event.target.value)} placeholder="username" />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="password"
              />
            </div>
            <div className="action-group">
              <button className="primary-btn" type="button" onClick={handleAuthSubmit}>
                {authMode === "login" ? "Login" : "Create account"}
              </button>
              <button
                className="ghost-btn"
                type="button"
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              >
                {authMode === "login" ? "Need account?" : "Have account?"}
              </button>
            </div>
            {socialStatus ? <p className="meta-line">{socialStatus}</p> : null}
            <button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Light" : "Dark"} mode
            </button>
          </article>
        </section>
      </div>
    );
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <div className="app">
        <header className="topbar card">
          <div>
            <h1>Astraea</h1>
            <p className="subtitle">{section === "dashboard" ? "Dashboard" : section === "ide" ? "Practice IDE" : section === "friends" ? "Friends" : "Saved sessions"}</p>
          </div>
          <div className="controls">
            {currentUser ? <span className="pill">@{currentUser.username}</span> : null}
            <button className="ghost-btn" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Light" : "Dark"} mode
            </button>
            <button className="ghost-btn" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <nav className="app-nav card">
          <button className={`nav-btn ${section === "dashboard" ? "active" : ""}`} type="button" onClick={() => setSection("dashboard")}>Dashboard</button>
          <button className={`nav-btn ${section === "ide" ? "active" : ""}`} type="button" onClick={() => setSection("ide")}>IDE</button>
          <button className={`nav-btn ${section === "friends" ? "active" : ""}`} type="button" onClick={() => setSection("friends")}>Friends</button>
          <button className={`nav-btn ${section === "sessions" ? "active" : ""}`} type="button" onClick={() => setSection("sessions")}>Sessions</button>
          <span className={`status status-${status.toLowerCase()}`}>{status}</span>
        </nav>

        {error ? <p className="error-banner">{error}</p> : null}

        {section === "dashboard" ? (
          <section className="dashboard-grid">
            <article className="card panel dashboard-hero">
              <h2>Start your next design round</h2>
              <p>Use the IDE to generate a fresh challenge, implement your design, and get rubric feedback instantly.</p>
              <div className="action-group">
                <button className="primary-btn" type="button" onClick={() => setSection("ide")}>Enter IDE</button>
                <button className="ghost-btn" type="button" onClick={() => setSection("sessions")}>Past sessions</button>
                <button className="ghost-btn" type="button" onClick={() => setSection("friends")}>Friends</button>
              </div>
            </article>
            <article className="card panel">
              <h3>Overview</h3>
              <ul>
                <li>Saved sessions: {savedSessions.length}</li>
                <li>Friends: {friends.length}</li>
                <li>Pending requests: {incomingRequests.length}</li>
                <li>Current language: {language}</li>
              </ul>
            </article>
            <article className="card panel">
              <h3>Latest activity</h3>
              <ul>
                {friendActivity.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    {item.message}
                    <span className="meta-line">{new Date(item.createdAt).toLocaleString()}</span>
                  </li>
                ))}
                {friendActivity.length === 0 ? <li>No friend activity yet</li> : null}
              </ul>
            </article>
          </section>
        ) : null}

        {section === "ide" ? (
          <>
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
                <button className="primary-btn" type="button" onClick={handleGenerateProblem}>New problem</button>
                <button className="ghost-btn" type="button" onClick={handleGrade} disabled={!problem}>Grade</button>
                <button className="ghost-btn" type="button" onClick={handleSaveSession} disabled={!problem}>Save session</button>
              </div>
            </section>

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
                    <ul>{problem.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                    <h4>Constraints</h4>
                    <ul>{problem.constraints.map((item) => <li key={item}>{item}</li>)}</ul>
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
                  basicSetup={{ foldGutter: false, highlightActiveLineGutter: false }}
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
                      <div><span>Overall</span><strong>{grade.overall}</strong></div>
                      <div><span>Design</span><strong>{grade.design}</strong></div>
                      <div><span>Correctness</span><strong>{grade.correctness}</strong></div>
                      <div><span>Extensibility</span><strong>{grade.extensibility}</strong></div>
                      <div><span>Clarity</span><strong>{grade.clarity}</strong></div>
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
          </>
        ) : null}

        {section === "friends" ? (
          <section className="social-grid">
            <article className="panel card">
              <div className="panel-header">
                <h2>Friends</h2>
                <span className="pill">{friends.length}</span>
              </div>
              <div className="field">
                <label>Add friend by username</label>
                <input value={friendUsername} onChange={(event) => setFriendUsername(event.target.value)} placeholder="friend username" disabled={!token} />
              </div>
              <button className="ghost-btn" type="button" onClick={handleSendFriendRequest} disabled={!token}>Send request</button>
              <h4>Incoming requests</h4>
              <ul>
                {incomingRequests.map((request) => (
                  <li key={request.id}>@{request.fromUser.username}<button className="link-btn" type="button" onClick={() => handleAcceptRequest(request.id)}>accept</button></li>
                ))}
                {incomingRequests.length === 0 ? <li>No pending requests</li> : null}
              </ul>
              <h4>Friends list</h4>
              <ul>
                {friends.map((friend) => <li key={friend.id}>@{friend.username}</li>)}
                {friends.length === 0 ? <li>No friends yet</li> : null}
              </ul>
            </article>

            <article className="panel card">
              <div className="panel-header"><h2>Friends activity</h2></div>
              <ul>
                {friendActivity.slice(0, 16).map((item) => (
                  <li key={item.id}>{item.message}<span className="meta-line">{new Date(item.createdAt).toLocaleString()}</span></li>
                ))}
                {friendActivity.length === 0 ? <li>No friend activity yet</li> : null}
              </ul>
              {socialStatus ? <p className="meta-line">{socialStatus}</p> : null}
            </article>
          </section>
        ) : null}

        {section === "sessions" ? (
          <section className="single-column">
            <article className="panel card">
              <div className="panel-header">
                <h2>Saved sessions</h2>
                <span className="pill">{savedSessions.length}</span>
              </div>
              <ul>
                {savedSessions.map((session) => (
                  <li key={session.id}>
                    <strong>{session.problemTitle}</strong>
                    <span className="meta-line">{session.language} · {session.difficulty} · {session.score !== null ? `score ${session.score}` : "ungraded"}</span>
                    <span className="meta-line">{new Date(session.createdAt).toLocaleString()}</span>
                    <div className="session-actions">
                      <button className="ghost-btn" type="button" onClick={() => handleOpenSavedSession(session)}>
                        Open in IDE
                      </button>
                      <button className="ghost-btn danger-btn" type="button" onClick={() => void handleDeleteSavedSession(session.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
                {savedSessions.length === 0 ? <li>No saved sessions yet</li> : null}
              </ul>
            </article>
          </section>
        ) : null}
      </div>
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

async function apiFetch(path: string, method: string, body?: unknown, token?: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) throw new Error(String(data.message ?? text ?? "Request failed"));
  return data;
}
