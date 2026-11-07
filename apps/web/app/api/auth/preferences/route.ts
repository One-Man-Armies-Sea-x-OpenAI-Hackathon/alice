import { z } from "zod";
import {
  requireUser,
  checkOrigin,
  authError,
  publicUser,
} from "../../../../lib/auth";
import { storePut } from "@alice/agents";
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  theme: z.enum(["dark", "light"]),
  depth: z.enum(["quick", "standard"]),
  mode: z.enum(["single", "multiple"]),
  external_research: z.boolean().default(true),
  tools: z.object({
    risk: z.boolean(),
    calendar: z.boolean(),
    rewrite: z.boolean(),
  }),
});
export async function PUT(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const pref = schema.parse(await req.json());
    const next = { ...user, name: pref.name, preferences: pref };
    await storePut("users", user.id, next);
    return Response.json({ user: publicUser(next) });
  } catch (e) {
    return authError(e);
  }
}
