import "server-only";
import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { core, storeGet, storePut } from "@alice/agents";
const scrypt = promisify(scryptCallback);
const COOKIE = "alice_session";
const lifetime = 7 * 24 * 60 * 60 * 1000;
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export type User = {
  id: string;
  email: string;
  name: string;
  session_version: number;
  password_hash: string;
  salt: string;
  preferences?: {
    name: string;
    theme: "dark" | "light";
    depth: "quick" | "standard";
    mode: "single" | "multiple";
    tools: { risk: boolean; calendar: boolean; rewrite: boolean };
  };
};
export async function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return {
    salt,
    password_hash: ((await scrypt(password, salt, 64)) as Buffer).toString(
      "hex",
    ),
  };
}
export async function passwordMatches(password: string, u: User) {
  const hash = await hashPassword(password, u.salt);
  const a = Buffer.from(hash.password_hash, "hex"),
    b = Buffer.from(u.password_hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  preferences: u.preferences,
});
export async function sessionUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await storeGet("sessions", digest(token));
  if (!session || session.expires_at < Date.now()) return null;
  const user = (await storeGet("users", session.user_id)) as User | null;
  if (!user || user.session_version !== session.version) return null;
  return user;
}
export async function requireUser() {
  const user = await sessionUser();
  if (!user) throw new Error("Authentication required");
  return user;
}
export async function ownRun(id: string) {
  const user = await requireUser();
  const saved = await storeGet("runs", id);
  if (!saved || saved.user_id !== user.id) throw new Error("Run not found");
  return user;
}
export async function issueSession(u: User) {
  const token = randomBytes(32).toString("base64url");
  await storePut("sessions", digest(token), {
    user_id: u.id,
    version: u.session_version,
    expires_at: Date.now() + lifetime,
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: lifetime / 1000,
  });
}
export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await core(`/v1/store/sessions/${digest(token)}`, undefined, "DELETE");
  jar.delete(COOKIE);
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (
    origin &&
    new URL(origin).host !== (req.headers.get("host") ?? new URL(req.url).host)
  )
    throw new Error("Invalid request origin");
}
const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimit(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now();
  const old = attempts.get(ip);
  const bucket =
    old && old.reset > now ? old : { count: 0, reset: now + 60000 };
  bucket.count++;
  attempts.set(ip, bucket);
  if (bucket.count > 15)
    throw new Error("Too many attempts. Please wait a minute.");
  if (attempts.size > 5000)
    for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
}
export function authError(e: unknown) {
  const message = e instanceof Error ? e.message : "Request failed";
  return Response.json(
    { error: message },
    {
      status:
        message === "Authentication required"
          ? 401
          : message === "Run not found"
            ? 404
            : message.startsWith("Too many")
              ? 429
              : 400,
    },
  );
}
