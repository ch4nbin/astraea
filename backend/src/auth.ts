import crypto from "node:crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function createToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
