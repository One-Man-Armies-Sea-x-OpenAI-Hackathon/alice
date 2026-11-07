import { requireUser, checkOrigin, authError } from "../../../lib/auth";
import { storeGet, storePut } from "@alice/agents";
export async function GET() {
  try {
    const u = await requireUser();
    return Response.json({
      chats: (await storeGet("conversations", u.id))?.chats ?? [],
    });
  } catch (e) {
    return authError(e);
  }
}
export async function PUT(req: Request) {
  try {
    checkOrigin(req);
    const u = await requireUser();
    const body = await req.json();
    if (
      !Array.isArray(body.chats) ||
      body.chats.length > 200 ||
      JSON.stringify(body).length > 2_000_000
    )
      throw new Error("Conversation history is too large");
    await storePut("conversations", u.id, { user_id: u.id, chats: body.chats });
    return Response.json({ ok: true });
  } catch (e) {
    return authError(e);
  }
}
