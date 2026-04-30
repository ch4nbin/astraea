import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { gradeRequestSchema, gradeResultSchema, generatedProblemSchema, problemRequestSchema } from "./schemas.js";
import { PlaywrightChatbotClient } from "./playwrightClient.js";
import { JsonStore, type StoredUser } from "./store.js";
import { createId, createToken, hashPassword } from "./auth.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const client = new PlaywrightChatbotClient();
const store = new JsonStore("data/store.json");

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

app.post("/api/auth/register", (req, res) => {
  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!username || password.length < 4) {
    res.status(400).json({ message: "Username and password (min 4 chars) are required." });
    return;
  }

  const snapshot = store.read();
  if (snapshot.users.some((user) => user.username === username)) {
    res.status(409).json({ message: "Username already exists." });
    return;
  }

  const newUser = {
    id: createId("usr"),
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  const token = createToken();
  const next = store.update((current) => ({
    ...current,
    users: [...current.users, newUser],
    tokens: [...current.tokens, { token, userId: newUser.id, createdAt: new Date().toISOString() }],
  }));

  const persistedUser = next.users.find((item) => item.id === newUser.id);
  res.json({ token, user: sanitizeUser(persistedUser!) });
});

app.post("/api/auth/login", (req, res) => {
  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const snapshot = store.read();
  const user = snapshot.users.find((item) => item.username === username);
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ message: "Invalid credentials." });
    return;
  }

  const token = createToken();
  store.update((current) => ({
    ...current,
    tokens: [...current.tokens, { token, userId: user.id, createdAt: new Date().toISOString() }],
  }));
  res.json({ token, user: sanitizeUser(user) });
});

app.get("/api/me", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  res.json({ user: sanitizeUser(auth.user) });
});

app.get("/api/sessions/mine", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const snapshot = store.read();
  const sessions = snapshot.sessions
    .filter((session) => session.userId === auth.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ sessions });
});

app.post("/api/sessions/save", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const problemTitle = String(req.body?.problem?.title ?? "Untitled Problem");
  const language = String(req.body?.language ?? "Python");
  const difficulty = String(req.body?.difficulty ?? "medium");
  const provider = String(req.body?.provider ?? "gemini");
  const domain = String(req.body?.domain ?? "random");
  const submission = String(req.body?.submission ?? "");
  const score = typeof req.body?.grade?.overall === "number" ? req.body.grade.overall : null;

  const session = {
    id: createId("ses"),
    userId: auth.user.id,
    problemTitle,
    language,
    difficulty,
    provider,
    domain,
    score,
    createdAt: new Date().toISOString(),
    problem: req.body?.problem ?? null,
    submission,
    grade: req.body?.grade ?? null,
  };

  store.update((current) => ({
    ...current,
    sessions: [session, ...current.sessions],
    activities: [
      {
        id: createId("act"),
        userId: auth.user.id,
        type: "session_saved",
        message: `${auth.user.username} saved session "${problemTitle}"${score !== null ? ` (score ${score})` : ""}.`,
        createdAt: new Date().toISOString(),
      },
      ...current.activities,
    ],
  }));

  res.json({ session });
});

app.delete("/api/sessions/:id", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const sessionId = String(req.params.id ?? "");
  if (!sessionId) {
    res.status(400).json({ message: "Session id is required." });
    return;
  }

  const snapshot = store.read();
  const target = snapshot.sessions.find((session) => session.id === sessionId);
  if (!target || target.userId !== auth.user.id) {
    res.status(404).json({ message: "Session not found." });
    return;
  }

  store.update((current) => ({
    ...current,
    sessions: current.sessions.filter((session) => session.id !== sessionId),
  }));

  res.json({ ok: true });
});

app.get("/api/friends", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const snapshot = store.read();

  const friends = snapshot.friendships
    .filter((edge) => edge.userA === auth.user.id || edge.userB === auth.user.id)
    .map((edge) => (edge.userA === auth.user.id ? edge.userB : edge.userA))
    .map((id) => snapshot.users.find((user) => user.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map(sanitizeUser);

  const incomingRequests = snapshot.friendRequests
    .filter((request) => request.toUserId === auth.user.id)
    .map((request) => {
      const from = snapshot.users.find((user) => user.id === request.fromUserId);
      return { id: request.id, fromUser: from ? sanitizeUser(from) : null, createdAt: request.createdAt };
    })
    .filter((item) => item.fromUser !== null);

  res.json({ friends, incomingRequests });
});

app.post("/api/friends/request", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const targetUsername = String(req.body?.username ?? "").trim().toLowerCase();
  if (!targetUsername) {
    res.status(400).json({ message: "Friend username is required." });
    return;
  }

  const snapshot = store.read();
  const target = snapshot.users.find((user) => user.username === targetUsername);
  if (!target) {
    res.status(404).json({ message: "User not found." });
    return;
  }
  if (target.id === auth.user.id) {
    res.status(400).json({ message: "You cannot add yourself." });
    return;
  }

  const alreadyFriends = snapshot.friendships.some(
    (edge) =>
      (edge.userA === auth.user.id && edge.userB === target.id) ||
      (edge.userA === target.id && edge.userB === auth.user.id),
  );
  if (alreadyFriends) {
    res.status(409).json({ message: "Already friends." });
    return;
  }

  const hasPending = snapshot.friendRequests.some(
    (request) =>
      (request.fromUserId === auth.user.id && request.toUserId === target.id) ||
      (request.fromUserId === target.id && request.toUserId === auth.user.id),
  );
  if (hasPending) {
    res.status(409).json({ message: "Friend request already pending." });
    return;
  }

  const requestId = createId("fr");
  store.update((current) => ({
    ...current,
    friendRequests: [
      ...current.friendRequests,
      { id: requestId, fromUserId: auth.user.id, toUserId: target.id, createdAt: new Date().toISOString() },
    ],
    activities: [
      {
        id: createId("act"),
        userId: auth.user.id,
        type: "friend_request_sent",
        message: `${auth.user.username} sent a friend request to ${target.username}.`,
        createdAt: new Date().toISOString(),
      },
      ...current.activities,
    ],
  }));

  res.json({ ok: true });
});

app.post("/api/friends/accept", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const requestId = String(req.body?.requestId ?? "");
  const snapshot = store.read();
  const request = snapshot.friendRequests.find((item) => item.id === requestId && item.toUserId === auth.user.id);
  if (!request) {
    res.status(404).json({ message: "Friend request not found." });
    return;
  }
  const fromUser = snapshot.users.find((item) => item.id === request.fromUserId);
  if (!fromUser) {
    res.status(404).json({ message: "Sender not found." });
    return;
  }

  store.update((current) => ({
    ...current,
    friendRequests: current.friendRequests.filter((item) => item.id !== request.id),
    friendships: [
      ...current.friendships,
      { userA: request.fromUserId, userB: request.toUserId, createdAt: new Date().toISOString() },
    ],
    activities: [
      {
        id: createId("act"),
        userId: auth.user.id,
        type: "friend_added",
        message: `${auth.user.username} accepted ${fromUser.username}'s friend request.`,
        createdAt: new Date().toISOString(),
      },
      {
        id: createId("act"),
        userId: fromUser.id,
        type: "friend_added",
        message: `${fromUser.username} is now friends with ${auth.user.username}.`,
        createdAt: new Date().toISOString(),
      },
      ...current.activities,
    ],
  }));

  res.json({ ok: true });
});

app.get("/api/activity/friends", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const snapshot = store.read();
  const friendIds = snapshot.friendships
    .filter((edge) => edge.userA === auth.user.id || edge.userB === auth.user.id)
    .map((edge) => (edge.userA === auth.user.id ? edge.userB : edge.userA));

  const activity = snapshot.activities
    .filter((item) => friendIds.includes(item.userId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
  res.json({ activity });
});

app.listen(port, () => {
  console.log(`Astraea backend listening on http://localhost:${port}`);
});

function requireAuth(req: express.Request, res: express.Response): { user: StoredUser } | null {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ message: "Missing auth token." });
    return null;
  }
  const snapshot = store.read();
  const entry = snapshot.tokens.find((item) => item.token === token);
  if (!entry) {
    res.status(401).json({ message: "Invalid auth token." });
    return null;
  }
  const user = snapshot.users.find((item) => item.id === entry.userId);
  if (!user) {
    res.status(401).json({ message: "User not found for token." });
    return null;
  }
  return { user };
}

function sanitizeUser(user: { id: string; username: string; createdAt: string }) {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

function handleError(error: unknown, res: express.Response): void {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Invalid request payload.", issues: error.issues });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown server error";
  res.status(500).json({ message });
}
