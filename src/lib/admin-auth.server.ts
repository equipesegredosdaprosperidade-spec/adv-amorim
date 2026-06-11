// Server-only admin auth. NEVER import this from client code.
// Filename ending in `.server.ts` is excluded from the client bundle.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(
      `Configuração inválida: a variável de ambiente ${name} é obrigatória. Defina-a nos secrets do backend.`,
    );
  }
  return v;
}

// Read at call time (NOT at module scope) so the server bundle never embeds them
// and so missing-secret errors surface as 500s on the relevant endpoint only.
function getAdminEmail(): string {
  return requireEnv("ADMIN_EMAIL").trim().toLowerCase();
}
function getAdminPassword(): string {
  return requireEnv("ADMIN_PASSWORD");
}
function getSigningSecret(): string {
  return requireEnv("ADMIN_SIGNING_SECRET");
}

function safeEqStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const e = (email || "").trim().toLowerCase();
  return safeEqStr(e, getAdminEmail()) && safeEqStr(password || "", getAdminPassword());
}

export function newSession(): string {
  return randomBytes(32).toString("hex"); // 64 chars
}

export function signSession(session: string): string {
  return createHmac("sha256", getSigningSecret()).update(session).digest("hex");
}

export function verifyAdminSession(session: string, signature: string): boolean {
  if (!session || !signature || session.length !== 64 || signature.length !== 64) return false;
  const expected = signSession(session);
  return safeEqStr(expected, signature);
}

// In-memory rate limiter (per worker instance). Best-effort; the client also rate-limits.
type Rate = { attempts: number; lockedUntil: number };
const rates = new Map<string, Rate>();
const LOCK_LADDER_MS = [30_000, 120_000, 600_000, 3_600_000];

export function checkRate(key: string): { locked: boolean; secondsLeft: number } {
  const r = rates.get(key);
  if (!r) return { locked: false, secondsLeft: 0 };
  const left = Math.max(0, Math.ceil((r.lockedUntil - Date.now()) / 1000));
  return { locked: r.lockedUntil > Date.now(), secondsLeft: left };
}

export function recordFailure(key: string) {
  const r = rates.get(key) ?? { attempts: 0, lockedUntil: 0 };
  r.attempts += 1;
  if (r.attempts >= 5) {
    const idx = Math.min(LOCK_LADDER_MS.length - 1, Math.floor(r.attempts / 5) - 1);
    r.lockedUntil = Date.now() + LOCK_LADDER_MS[idx];
  }
  rates.set(key, r);
}

export function clearRate(key: string) {
  rates.delete(key);
}
