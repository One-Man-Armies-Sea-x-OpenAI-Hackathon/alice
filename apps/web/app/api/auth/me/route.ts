import { sessionUser, publicUser } from "../../../../lib/auth";
export async function GET() {
  const u = await sessionUser();
  return Response.json({ user: u ? publicUser(u) : null });
}
