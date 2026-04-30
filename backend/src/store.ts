import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  problemTitle: string;
  language: string;
  difficulty: string;
  provider: string;
  domain: string;
  score: number | null;
  createdAt: string;
  problem: unknown;
  submission: string;
  grade: unknown;
}

export interface StoredActivity {
  id: string;
  userId: string;
  type: "session_saved" | "friend_request_sent" | "friend_added";
  message: string;
  createdAt: string;
}

export interface StoredFriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
}

export interface DataStoreShape {
  users: StoredUser[];
  sessions: StoredSession[];
  activities: StoredActivity[];
  friendships: Array<{ userA: string; userB: string; createdAt: string }>;
  friendRequests: StoredFriendRequest[];
  tokens: Array<{ token: string; userId: string; createdAt: string }>;
}

const defaultStore: DataStoreShape = {
  users: [],
  sessions: [],
  activities: [],
  friendships: [],
  friendRequests: [],
  tokens: [],
};

export class JsonStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.ensureFile();
  }

  read(): DataStoreShape {
    const raw = readFileSync(this.filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DataStoreShape>;
    return {
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      activities: parsed.activities ?? [],
      friendships: parsed.friendships ?? [],
      friendRequests: parsed.friendRequests ?? [],
      tokens: parsed.tokens ?? [],
    };
  }

  write(next: DataStoreShape): void {
    writeFileSync(this.filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  update(updater: (current: DataStoreShape) => DataStoreShape): DataStoreShape {
    const current = this.read();
    const next = updater(current);
    this.write(next);
    return next;
  }

  private ensureFile(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(this.filePath)) {
      this.write(defaultStore);
    }
  }
}
