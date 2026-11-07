import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: ["@alice/contracts", "@alice/agents"],
  serverExternalPackages: ["@openai/agents", "openai"],
  allowedDevOrigins: ["127.0.0.1"],
};
export default config;
