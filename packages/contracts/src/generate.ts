import { z } from "zod";
import * as schemas from "./index";
import { mkdir, writeFile } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";
await mkdir("schemas", { recursive: true });
const types = [];
for (const [name, schema] of Object.entries(schemas))
  if (name.endsWith("Schema") && schema instanceof z.ZodType) {
    const json = z.toJSONSchema(schema);
    await writeFile(`schemas/${name}.json`, JSON.stringify(json, null, 2));
    types.push(
      await compile(json as any, name.replace("Schema", ""), {
        bannerComment: "",
      }),
    );
  }
await writeFile("src/generated.d.ts", types.join("\n"));
console.log(
  `Generated ${types.length} JSON schemas and TypeScript declarations.`,
);
