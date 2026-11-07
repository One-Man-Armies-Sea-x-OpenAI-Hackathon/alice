/** Decode BFF responses without exposing raw HTML or JSON parser errors to users. */
export async function readJson<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  let body: any;
  try {
    if (!text.trim()) throw new Error();
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `The server returned ${text.trim() ? "an unreadable" : "an empty"} response (HTTP ${response.status}). Please try again.`,
    );
  }
  if (!response.ok)
    throw new Error(
      body?.error ||
        `The request failed (HTTP ${response.status}). Please try again.`,
    );
  return body;
}

export async function pollTask<T = any>(
  initial: any,
  onProgress?: (status: string) => void,
): Promise<T> {
  if (!initial.task_id) return initial;
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    const task = await readJson(
      await fetch(`/api/tasks/${initial.task_id}`, { cache: "no-store" }),
    );
    if (task.state === "done") return task.result;
    if (task.state === "failed")
      throw new Error(task.error || "Processing failed. Please try again.");
    onProgress?.(task.phase || task.state);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    "Processing is taking too long. Please reopen the conversation and try again.",
  );
}

export async function requestTask<T = any>(
  url: string,
  init: RequestInit,
  onAccepted?: (id: string) => void,
  onProgress?: (phase: string) => void,
) {
  const headers = new Headers(init.headers);
  headers.set("Prefer", "respond-async");
  const initial = await readJson(await fetch(url, { ...init, headers }));
  if (initial.task_id) onAccepted?.(initial.task_id);
  return pollTask<T>(initial, onProgress);
}

export async function uploadReference(
  file: File,
  onUpload: (percentage: number) => void,
  onReading: () => void,
) {
  const initial = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/reference");
    xhr.setRequestHeader("Prefer", "respond-async");
    xhr.timeout = 60_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onUpload(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (!xhr.status)
        return reject(
          new Error("The upload connection was interrupted. Please try again."),
        );
      readJson(new Response(xhr.responseText, { status: xhr.status })).then(
        resolve,
        reject,
      );
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "The reference could not be uploaded. Check your connection and try again.",
        ),
      );
    xhr.ontimeout = () =>
      reject(new Error("The upload timed out. Please try again."));
    const form = new FormData();
    form.append("image", file);
    xhr.send(form);
  });
  onReading();
  return pollTask(initial);
}
