import {
  checkOrigin,
  rateLimit,
  digest,
  hashPassword,
  issueSession,
  publicUser,
  authError,
  type User,
} from "../../../../lib/auth";
import { core, storeGet } from "@alice/agents";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    rateLimit(req);
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !name ||
      name.length > 80 ||
      password.length < 10 ||
      password.length > 256
    )
      throw new Error(
        "Use a valid email, a name, and a password of 10–256 characters",
      );
    const id = digest(email);
    if (await storeGet("users", id))
      throw new Error("An account with this email already exists");
    const user: User = {
      id,
      email,
      name,
      session_version: 1,
      ...(await hashPassword(password)),
    };
    await core(`/v1/store/users/${id}`, user, "POST");
    await issueSession(user);
    return Response.json({ user: publicUser(user) }, { status: 201 });
  } catch (e) {
    return authError(e);
  }
}
