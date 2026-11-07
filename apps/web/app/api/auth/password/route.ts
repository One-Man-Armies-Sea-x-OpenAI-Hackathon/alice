import {
  requireUser,
  checkOrigin,
  passwordMatches,
  hashPassword,
  issueSession,
  authError,
} from "../../../../lib/auth";
import { storePut } from "@alice/agents";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const u = await requireUser();
    const body = await req.json();
    if (!(await passwordMatches(String(body.current_password || ""), u)))
      throw new Error("Current password is incorrect");
    const password = String(body.new_password || "");
    if (password.length < 10 || password.length > 256)
      throw new Error("New password must have 10–256 characters");
    const next = {
      ...u,
      ...(await hashPassword(password)),
      session_version: u.session_version + 1,
    };
    await storePut("users", u.id, next);
    await issueSession(next);
    return Response.json({ ok: true });
  } catch (e) {
    return authError(e);
  }
}
