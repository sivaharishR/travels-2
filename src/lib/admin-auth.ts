import { randomUUID } from "crypto";

// Server-only admin authentication.
// Simple token-based sessions kept in memory (single-server demo app).
// Credentials can be overridden via ADMIN_USERNAME / ADMIN_PASSWORD env vars.

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "quickcab123";

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// token -> expiry timestamp
const sessions = new Map<string, number>();

// Slow down brute-force attempts a little
let lastFailedAttemptAt = 0;
const MIN_FAILED_RETRY_MS = 1000;

export function verifyCredentials(username: string, password: string): boolean {
  return (
    username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD
  );
}

export function isRateLimited(): boolean {
  return Date.now() - lastFailedAttemptAt < MIN_FAILED_RETRY_MS;
}

export function markFailedAttempt(): void {
  lastFailedAttemptAt = Date.now();
}

export function issueToken(): string {
  // Opportunistic cleanup of expired sessions
  const now = Date.now();
  for (const [token, expiry] of sessions) {
    if (expiry < now) sessions.delete(token);
  }
  const token = randomUUID();
  sessions.set(token, now + TOKEN_TTL_MS);
  return token;
}

export function validateToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function revokeToken(token: string | null | undefined): void {
  if (token) sessions.delete(token);
}

export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export const ADMIN_NAME = ADMIN_USERNAME;
