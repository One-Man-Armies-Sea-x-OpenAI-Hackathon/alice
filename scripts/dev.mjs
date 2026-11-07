import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
for (const file of [resolve("../.env"), resolve(".env")])
  if (existsSync(file)) process.loadEnvFile(file);
process.env.CORE_PORT ??= "4000";
process.env.PORT ??= "3000";
process.env.CORE_BASE_URL ??= `http://127.0.0.1:${process.env.CORE_PORT}`;
if (
  !process.env.DATABASE_URL &&
  process.env.MOCK !== "1" &&
  process.env.MOCK !== "true"
) {
  const docker = spawnSync("docker", ["info"], { stdio: "ignore" });
  if (docker.status === 0) {
    const r = spawnSync("docker", ["compose", "up", "-d", "--wait"], {
      stdio: "inherit",
    });
    if (r.status !== 0) process.exit(1);
    process.env.DATABASE_URL =
      "postgres://alice:alice_local@127.0.0.1:5433/alice";
  } else
    console.warn(
      "Docker unavailable: using durable local files. Start Docker and restart for Postgres.",
    );
}
const children = [];
const start = (cmd, args) => {
  const c = spawn(cmd, args, { stdio: "inherit", env: process.env });
  children.push(c);
  c.on("exit", (code) => {
    if (code) stop(code);
  });
  return c;
};
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 250);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
start("cargo", [
  "run",
  "--release",
  "--manifest-path",
  "services/core/Cargo.toml",
]);
start("npm", [
  "run",
  "dev",
  "-w",
  "@alice/web",
  "--",
  "--hostname",
  "127.0.0.1",
  "--port",
  process.env.PORT,
]);
