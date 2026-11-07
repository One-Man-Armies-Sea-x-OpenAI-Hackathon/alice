import { checkOrigin, clearSession, authError } from "../../../../lib/auth";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    await clearSession();
    return Response.json({ ok: true });
  } catch (e) {
    return authError(e);
  }
}
