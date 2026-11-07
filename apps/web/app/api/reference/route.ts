import { z } from "zod";
import { requireUser, checkOrigin, authError } from "../../../lib/auth";
import { structured, Budget, withAccount } from "@alice/agents";
const schema = z.object({
  description: z.string().max(1200),
  detected_text: z.array(z.string()),
  uncertainties: z.array(z.string()),
});
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const form = await req.formData();
    const file = form.get("image");
    if (
      !(file instanceof File) ||
      file.size > 3_000_000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    )
      throw new Error("Choose a PNG, JPEG or WebP image under 3 MB");
    const data = Buffer.from(await file.arrayBuffer());
    const valid =
      file.type === "image/png"
        ? data
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : file.type === "image/jpeg"
          ? data[0] === 255 && data[1] === 216
          : data.toString("ascii", 0, 4) === "RIFF" &&
            data.toString("ascii", 8, 12) === "WEBP";
    if (!valid) throw new Error("The image format could not be verified");
    const b = new Budget(3);
    const result = await withAccount(user.id, () =>
      structured(
        "visual_reference",
        schema,
        "Describe only what is visibly present in the creative reference, in plain English. Include composition, objects, product placement, colors and visible text. Do not invent product claims, identify people or infer protected traits. State uncertainty when details cannot be read. This description will be passed to synthetic people as the visual context; it is not a claim the image was shown to each model.",
        { filename: file.name },
        b,
        {
          role: "reaction",
          imageDataUrl: `data:${file.type};base64,${data.toString("base64")}`,
          mock: () => ({
            description:
              "Mock visual reference received. Describe the visible scene and product placement before a live run.",
            detected_text: [],
            uncertainties: ["Image analysis is mocked in this workspace."],
          }),
        },
      ),
    );
    return Response.json({
      ...result,
      mock: process.env.MOCK === "1" || process.env.MOCK === "true",
      llm_calls: b.calls,
      cache_hits: b.cache_hits,
    });
  } catch (e) {
    return authError(e);
  }
}
