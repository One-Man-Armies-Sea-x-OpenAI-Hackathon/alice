import test from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../../../apps/web/lib/http";
import { createTask, readTask, deleteUserTasks } from "../src/tasks";

test("empty and HTML BFF failures produce actionable errors, not JSON parser errors", async () => {
  for (const body of ["", "<html>Gateway timeout</html>"])
    await assert.rejects(
      readJson(new Response(body, { status: 502 })),
      (e) =>
        e instanceof Error &&
        !(e instanceof SyntaxError) &&
        /HTTP 502/.test(e.message),
    );
  await assert.rejects(
    readJson(Response.json({ error: "Sign in again" }, { status: 401 })),
    /Sign in again/,
  );
  assert.deepEqual(await readJson(Response.json({ ready: true })), {
    ready: true,
  });
});
test("background tasks return immediately and keep results scoped to their owner", async () => {
  let finish!: (value: unknown) => void;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const task = createTask("task-owner", "reference", () => pending);
  assert.ok(task.task_id);
  assert.equal(readTask("another-user", task.task_id), null);
  await new Promise(setImmediate);
  assert.equal(readTask("task-owner", task.task_id)?.state, "running");
  finish({ description: "Product on a table" });
  await new Promise(setImmediate);
  assert.deepEqual(readTask("task-owner", task.task_id)?.result, {
    description: "Product on a table",
  });
  deleteUserTasks("task-owner");
});
test("failed and deleted tasks cannot reappear after completion", async () => {
  const failed = createTask("task-failure", "clarify", async () => {
    throw new Error("Provider unavailable");
  });
  await new Promise(setImmediate);
  assert.equal(readTask("task-failure", failed.task_id)?.state, "failed");
  assert.equal(
    readTask("task-failure", failed.task_id)?.error,
    "Provider unavailable",
  );
  let finish!: () => void;
  const deleted = createTask(
    "task-deleted",
    "clarify",
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await new Promise(setImmediate);
  deleteUserTasks("task-deleted");
  finish();
  await new Promise(setImmediate);
  assert.equal(readTask("task-deleted", deleted.task_id), null);
  deleteUserTasks("task-failure");
});
