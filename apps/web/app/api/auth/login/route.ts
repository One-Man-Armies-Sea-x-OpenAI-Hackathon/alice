import {
  checkOrigin,
  rateLimit,
  digest,
  passwordMatches,
  issueSession,
  publicUser,
  hashPassword,
  authError,
  type User,
} from "../../../../lib/auth";
import { storeGet } from "@alice/agents";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    rateLimit(req);
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    if (password.length > 256) throw new Error("Invalid email or password");
    const u = (await storeGet("users", digest(email))) as User | null;
    if (!u) {
      await hashPassword("timing-equalization");
      throw new Error("Invalid email or password");
    }
    if (!(await passwordMatches(password, u)))
      throw new Error("Invalid email or password");
    await issueSession(u);
    return Response.json({ user: publicUser(u) });
  } catch (e) {
    return authError(e);
  }
}
