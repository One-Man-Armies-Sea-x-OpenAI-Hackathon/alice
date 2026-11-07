import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";
const config: NextConfig = {
  devIndicators: false,
  distDir: process.env.ALICE_NEXT_DIST_DIR || ".next",
  transpilePackages: ["@alice/contracts", "@alice/agents"],
  serverExternalPackages: ["@openai/agents", "openai"],
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    ...Object.values(networkInterfaces()).flatMap((items) =>
      (items ?? [])
        .filter((i) => !i.internal && i.family === "IPv4")
        .map((i) => i.address),
    ),
  ],
};
export default config;
