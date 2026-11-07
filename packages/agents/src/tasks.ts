import { randomUUID } from "node:crypto";
type Task = {
  id: string;
  owner: string;
  kind: string;
  state: "queued" | "running" | "done" | "failed";
  created_at: number;
  updated_at: number;
  result?: unknown;
  error?: string;
  phase?: string;
};
const state = globalThis as typeof globalThis & {
  aliceTasks?: Map<string, Task>;
};
const tasks = (state.aliceTasks ??= new Map<string, Task>());
function prune() {
  const now = Date.now();
  for (const [id, t] of tasks)
    if (now - t.updated_at > 60 * 60_000) tasks.delete(id);
}
export function createTask(
  owner: string,
  kind: string,
  run: (progress: (phase: string) => void) => Promise<unknown>,
) {
  prune();
  if (
    [...tasks.values()].filter(
      (t) =>
        t.owner === owner && (t.state === "queued" || t.state === "running"),
    ).length >= 12
  )
    throw new Error(
      "Your workspace is processing several requests. Please wait for one to finish.",
    );
  const task: Task = {
    id: randomUUID(),
    owner,
    kind,
    state: "queued",
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  tasks.set(task.id, task);
  void Promise.resolve().then(async () => {
    if (!tasks.has(task.id)) return;
    task.state = "running";
    task.updated_at = Date.now();
    try {
      const result = await run((phase) => {
        if (tasks.has(task.id)) {
          task.phase = phase;
          task.updated_at = Date.now();
        }
      });
      if (tasks.has(task.id)) {
        task.result = result;
        task.state = "done";
      }
    } catch (e) {
      task.error =
        e instanceof Error ? e.message : "Processing failed. Please try again.";
      task.state = "failed";
    } finally {
      task.updated_at = Date.now();
    }
  });
  return { task_id: task.id, state: task.state };
}
export function readTask(owner: string, id: string) {
  prune();
  const task = tasks.get(id);
  if (!task || task.owner !== owner) return null;
  const { owner: _, ...publicTask } = task;
  return publicTask;
}
export function deleteUserTasks(owner: string) {
  for (const [id, t] of tasks) if (t.owner === owner) tasks.delete(id);
}
