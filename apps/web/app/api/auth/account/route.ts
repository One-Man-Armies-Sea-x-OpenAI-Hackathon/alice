import {
  requireUser,
  checkOrigin,
  passwordMatches,
  clearSession,
  authError,
} from "../../../../lib/auth";
import { core, storePut, cancelOwnedRuns } from "@alice/agents";
export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const u = await requireUser();
    const body = await req.json();
    if (!(await passwordMatches(String(body.password || ""), u)))
      throw new Error("Password is incorrect");
    cancelOwnedRuns(u.id);
    await core(`/v1/account/${u.id}`, undefined, "DELETE");
    await clearSession();
    return Response.json({ ok: true });
  } catch (e) {
    return authError(e);
  }
}
