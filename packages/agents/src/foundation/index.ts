import OpenAI from "openai";
import { AsyncLocalStorage } from "node:async_hooks";
const accountContext = new AsyncLocalStorage<string>();
export const withAccount = <T>(userId: string, task: () => T): T =>
  accountContext.run(userId, task);
import {
  Agent,
  Runner,
  OpenAIProvider,
  setTracingExportApiKey,
  withTrace,
} from "@openai/agents";
import { z } from "zod";
import pLimit from "p-limit";
import { createHash } from "node:crypto";
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { tiers, type Campaign } from "@alice/contracts";
export const root = () => {
  let p = process.cwd();
  return p.endsWith("/apps/web") ? resolve(p, "../..") : p;
};
export const mockMode = () => ["1", "true"].includes(process.env.MOCK ?? "");
// Persona model, MCP checked 2026-11-07: https://developers.openai.com/api/docs/models/gpt-5.6-luna
// https://developers.openai.com/api/docs/models/gpt-4.1 — configurable model roles; all variants use reaction.
const DEFAULT_PERSONA_MODEL = "gpt-5.6-luna";
export const models = () => ({
  reaction: process.env.REACTION_MODEL || DEFAULT_PERSONA_MODEL,
  analysis: process.env.ANALYSIS_MODEL || "gpt-4.1",
});
export const coreBase = () =>
  process.env.CORE_BASE_URL || "http://127.0.0.1:4000";
export async function core<T = any>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const r = await fetch(coreBase() + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(process.env.CORE_INTERNAL_TOKEN
        ? { Authorization: `Bearer ${process.env.CORE_INTERNAL_TOKEN}` }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Core ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
export const storeGet = async (table: string, id: string) => {
  try {
    return await core(`/v1/store/${table}/${id}`);
  } catch (e) {
    if (String(e).includes("404")) return null;
    throw e;
  }
};
export const storePut = (table: string, id: string, value: unknown) =>
  core(`/v1/store/${table}/${id}`, value, "PUT");
export function prompt(name: string) {
  return readFileSync(resolve(root(), `prompts/runtime/${name}.md`), "utf8");
}
export function catalog() {
  return readFileSync(resolve(root(), "docs/07-RISK-AND-CULTURE.md"), "utf8");
}
export class BudgetError extends Error {}
export class Budget {
  calls = 0;
  cache_hits = 0;
  failures = 0;
  tokens = 0;
  estimated_usd = 0;
  web_search_calls = 0;
  cap: number;
  shouldStop?: () => boolean;
  constructor(cap = Number(process.env.MAX_CALLS_PER_RUN || 16000)) {
    this.cap = cap;
  }
  take() {
    if (this.shouldStop?.()) throw new BudgetError("Run cancelled.");
    if (this.calls >= this.cap)
      throw new BudgetError(
        `Run reached its hard cap of ${this.cap} model attempts. Try Quick depth or fewer tools.`,
      );
    this.calls++;
  }
}
export function estimate(c: Campaign) {
  const a = tiers[c.depth].archetypes;
  const reaction = a * (c.variants.length + (c.variants.length > 1 ? 1 : 0));
  const fixes =
    c.tools.risk && c.tools.rewrite
      ? 2 * (a + 2) * Math.min(3, c.variants.length)
      : 0;
  // Planning allowance for bounded retries; the Budget cap remains the hard limit.
  const calls = Math.ceil((reaction + fixes + 8) * 1.2);
  return {
    calls,
    reaction_calls: reaction,
    fix_reserve: fixes,
    cap: Number(process.env.MAX_CALLS_PER_RUN || 16000),
    seconds: Math.ceil(
      ((reaction + fixes) / Number(process.env.LLM_CONCURRENCY || 8)) * 10 +
        100,
    ),
    estimated_usd: Number((calls * 0.004).toFixed(2)),
    cost_note:
      "Planning estimate with a 20% retry allowance. Latency calibrated against a 191-second Quick two-direction run on 2026-11-07; actual time, fixes and retries vary. Startup key probes and brief research are separate.",
    personas: tiers[c.depth].personas,
    archetypes: a,
  };
}
const keys = () => {
  const raw = process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((x) => typeof x === "string");
  } catch {}
  return raw.split(/[\s,;]+/).filter(Boolean);
};
let keyIndex = 0;
const spent = new Map<number, number>();
export const poolStatus = () => ({
  position: keyIndex + 1,
  total: keys().length,
  estimated_usd: [...spent.values()].reduce((a, b) => a + b, 0),
  skipped_positions: [...skipped].map((i) => i + 1),
  last_key: keyIndex === keys().length - 1,
});
export function classifyError(e: unknown) {
  const err = e as {
    status?: number;
    code?: string;
    name?: string;
    constructor?: { name?: string };
    cause?: { code?: string };
    error?: { code?: string };
  };
  const code = err.code || err.error?.code;
  const type = err.constructor?.name || err.name;
  // Docs MCP: https://developers.openai.com/api/docs/guides/error-codes
  // Connection failures and timeouts have no HTTP status; they are not model-access errors.
  if (
    [err.name, type].some((n) =>
      [
        "APIConnectionError",
        "APIConnectionTimeoutError",
        "APITimeoutError",
      ].includes(n ?? ""),
    ) ||
    [
      "ECONNRESET",
      "ETIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT",
      "EAI_AGAIN",
    ].includes(err.cause?.code ?? "")
  )
    return "transient";
  if (
    [err.name, type].some((n) =>
      [
        "ZodError",
        "SyntaxError",
        "ModelBehaviorError",
        "MaxTurnsExceededError",
      ].includes(n ?? ""),
    )
  )
    return "output";
  return code === "credit_balance_exhausted"
    ? "credit"
    : err.status === 429
      ? "rate"
      : err.status === 401 || err.status === 403
        ? "auth"
        : (err.status ?? 0) >= 500
          ? "transient"
          : "fatal";
}
const limiter = pLimit(Math.max(1, Number(process.env.LLM_CONCURRENCY || 8)));
function canonical(v: any): any {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canonical(v[k])]),
    );
  return v;
}
// Exact error distinctions: https://developers.openai.com/api/docs/guides/error-codes
// JSON schema: https://developers.openai.com/api/docs/guides/structured-outputs
// Agents outputType/Runner/provider: https://developers.openai.com/api/docs/guides/agents/define-agents
export async function structured<T>(
  name: string,
  schema: z.ZodType<T>,
  instructions: string,
  input: unknown,
  budget: Budget,
  options: {
    role?: "reaction" | "analysis";
    sample?: number;
    agent?: boolean;
    mock: () => T;
    guardrail?: () => Promise<{ decision: string; reason: string }>;
    imageDataUrl?: string;
    webSearch?: boolean;
    onSources?: (
      sources: { url: string; title: string }[],
      calls: number,
      retrievedAt: string,
    ) => void;
  },
): Promise<T> {
  const model = models()[options.role ?? "analysis"];
  const json = z.toJSONSchema(schema, { target: "draft-7" });
  delete json.$schema;
  const hash = createHash("sha256")
    .update(
      JSON.stringify(
        canonical({
          version: 2,
          account_id: accountContext.getStore() ?? "local-tests",
          name,
          model,
          reasoning_effort:
            model === DEFAULT_PERSONA_MODEL
              ? options.webSearch
                ? "low"
                : "none"
              : null,
          ...(options.webSearch
            ? { web_search: { max_tool_calls: 2, max_output_tokens: 6000 } }
            : {}),
          json,
          image_hash: options.imageDataUrl
            ? createHash("sha256").update(options.imageDataUrl).digest("hex")
            : null,
          instructions,
          input,
          sample: options.sample ?? 1,
          mock: mockMode(),
        }),
      ),
    )
    .digest("hex");
  const cached = await storeGet("llm_cache", hash);
  if (cached) {
    budget.cache_hits++;
    options.onSources?.(cached.sources ?? [], 0, cached.created);
    return schema.parse(cached.response);
  }
  return limiter(async () => {
    let data: T;
    let usage = { input_tokens: 0, output_tokens: 0 };
    let sources: { url: string; title: string }[] = [];
    let searchCalls = 0;
    if (mockMode()) {
      budget.take();
      data = schema.parse(options.mock());
    } else {
      const all = keys();
      if (!all.length)
        throw new Error(
          "No server-side OpenAI key configured. Use MOCK=1 for offline development.",
        );
      let done = false;
      let attempt = 0;
      data = undefined as T;
      while (!done) {
        const pos = keyIndex;
        if (pos >= all.length)
          throw new Error(
            "All key credits are exhausted. Open a cached demo replay.",
          );
        budget.take();
        const client = new OpenAI({
          apiKey: all[pos],
          maxRetries: 0,
          timeout: options.webSearch ? 90000 : 60000,
        });
        try {
          setTracingExportApiKey(all[pos]);
          if (options.agent) {
            const provider = new OpenAIProvider({ openAIClient: client });
            const runner = new Runner({
              modelProvider: provider,
              traceIncludeSensitiveData: false,
            });
            const agent = new Agent({
              name,
              instructions,
              model,
              inputGuardrails: options.guardrail
                ? [
                    {
                      name: "Campaign safety",
                      runInParallel: false,
                      execute: async () => {
                        const decision = await options.guardrail!();
                        return {
                          outputInfo: decision,
                          tripwireTriggered: decision.decision === "blocked",
                        };
                      },
                    },
                  ]
                : [],
              outputType: {
                type: "json_schema",
                name,
                schema: json as any,
                strict: true,
              },
            });
            const result = await runner.run(agent, JSON.stringify(input), {
              maxTurns: 1,
            });
            if (!result.finalOutput)
              throw new Error("Agent returned no structured result");
            data = schema.parse(result.finalOutput);
            const u = result.state.usage;
            usage = {
              input_tokens: u.inputTokens,
              output_tokens: u.outputTokens,
            };
          } else {
            const response = await withTrace(name, () =>
              client.responses.create({
                model,
                ...(model === DEFAULT_PERSONA_MODEL
                  ? {
                      reasoning: {
                        effort: options.webSearch
                          ? ("low" as const)
                          : ("none" as const),
                      },
                    }
                  : {}),
                // Docs MCP: https://developers.openai.com/api/docs/guides/tools-web-search
                // Cap: https://developers.openai.com/api/reference/resources/responses/methods/create
                ...(options.webSearch
                  ? {
                      tools: [
                        {
                          type: "web_search" as const,
                          search_context_size: "low" as const,
                        },
                      ],
                      tool_choice: "required" as const,
                      max_tool_calls: 2,
                      include: ["web_search_call.action.sources" as const],
                    }
                  : {}),
                instructions,
                // MCP: https://developers.openai.com/api/docs/guides/images-vision
                input: options.imageDataUrl
                  ? [
                      {
                        role: "user",
                        content: [
                          { type: "input_text", text: JSON.stringify(input) },
                          {
                            type: "input_image",
                            image_url: options.imageDataUrl,
                            detail: "low",
                          },
                        ],
                      },
                    ]
                  : JSON.stringify(input),
                text: {
                  format: {
                    type: "json_schema",
                    name,
                    schema: json as any,
                    strict: true,
                  },
                },
                max_output_tokens: options.webSearch ? 6000 : 16000,
                store: false,
              }),
            );
            if (response.status !== "completed")
              throw new Error("Model output was incomplete");
            if (options.webSearch) {
              const found = new Map<string, { url: string; title: string }>();
              for (const item of response.output as any[]) {
                if (item.type === "web_search_call") {
                  searchCalls++;
                  for (const source of item.action?.sources ?? [])
                    if (source.url)
                      found.set(source.url, {
                        url: source.url,
                        title: source.title || new URL(source.url).hostname,
                      });
                }
                if (item.type === "message")
                  for (const content of item.content ?? [])
                    for (const citation of content.annotations ?? [])
                      if (citation.type === "url_citation")
                        found.set(citation.url, {
                          url: citation.url,
                          title:
                            citation.title || new URL(citation.url).hostname,
                        });
              }
              sources = [...found.values()];
            }
            if (
              response.output.some(
                (x) =>
                  x.type === "message" &&
                  x.content.some((y) => y.type === "refusal"),
              )
            )
              throw new Error("Model refused this request");
            data = schema.parse(JSON.parse(response.output_text));
            usage = {
              input_tokens: response.usage?.input_tokens ?? 0,
              output_tokens: response.usage?.output_tokens ?? 0,
            };
          }
          done = true;
          // Rates: https://developers.openai.com/api/docs/pricing (2026-11-07).
          const rates = options.role === "reaction" ? [0.2, 1.2] : [2, 8];
          const cost =
            (usage.input_tokens * rates[0] + usage.output_tokens * rates[1]) /
              1e6 +
            searchCalls * 0.01;
          // Hosted web search: $10/1k calls, Docs MCP checked 2026-11-07.
          // https://developers.openai.com/api/docs/pricing
          budget.web_search_calls += searchCalls;
          budget.estimated_usd += cost;
          spent.set(pos, (spent.get(pos) || 0) + cost);
          budget.tokens += usage.input_tokens + usage.output_tokens;
        } catch (e) {
          const kind = classifyError(e);
          if (kind === "credit") {
            if (keyIndex === pos) {
              keyIndex++;
              while (skipped.has(keyIndex)) keyIndex++;
            }
            continue;
          }
          if (
            !options.webSearch &&
            (kind === "rate" || kind === "transient" || kind === "output") &&
            attempt++ < (kind === "output" ? 1 : 3)
          ) {
            await new Promise((r) =>
              setTimeout(
                r,
                Math.min(15000, 1000 * 2 ** attempt) + Math.random() * 400,
              ),
            );
            continue;
          }
          const err = e as any;
          // Diagnostic categories only: never write request payloads, model output or credentials.
          try {
            mkdirSync(resolve(root(), ".data"), { recursive: true });
            appendFileSync(
              resolve(root(), ".data/provider-errors.jsonl"),
              JSON.stringify({
                at: new Date().toISOString(),
                step: name,
                name: err.name,
                type: err.constructor?.name,
                status: err.status,
                code: err.code,
                cause: err.cause?.code ?? err.cause?.name,
                issues: err.issues?.map((i: any) => ({
                  code: i.code,
                  path: i.path,
                })),
              }) + "\n",
            );
          } catch {
            /* Diagnostics must not replace the original error. */
          }
          throw new Error(
            name === "guardrail" && !err.status
              ? `The campaign safety check could not complete (${kind === "output" ? "invalid model response" : kind === "transient" ? "connection interrupted" : "provider processing error"}). Your brief was not rejected. Please send it again.`
              : `OpenAI ${name} could not complete (key position ${pos + 1}, ${err.status ?? kind}). ${kind === "auth" ? "Check server key access." : kind === "fatal" && err.status ? "Check model access and request configuration." : "Please try again."}`,
          );
        }
      }
    }
    const owner = accountContext.getStore();
    if (owner && !(await storeGet("users", owner))) return data!;
    await storePut("llm_cache", hash, {
      user_id: accountContext.getStore() ?? "local-tests",
      response: data!,
      model,
      tokens: usage,
      ...(options.webSearch ? { sources, search_calls: searchCalls } : {}),
      created: new Date().toISOString(),
      mock: mockMode(),
    });
    options.onSources?.(sources, searchCalls, new Date().toISOString());
    return data!;
  });
}
let preflightPromise: Promise<void> | undefined;
const skipped = new Set<number>();
export function preflight() {
  if (mockMode()) return Promise.resolve();
  return (preflightPromise ??= checkKeys().catch((error) => {
    preflightPromise = undefined;
    throw error;
  }));
}
async function checkKeys() {
  const all = keys();
  if (!all.length) throw new Error("No OpenAI key configured.");
  for (let i = 0; i < all.length; i++) {
    for (const model of new Set(Object.values(models()))) {
      try {
        const client = new OpenAI({
          apiKey: all[i],
          maxRetries: 0,
          timeout: 20000,
        });
        await client.responses.create({
          model,
          input: "Reply OK.",
          max_output_tokens: 16,
          store: false,
        });
      } catch (e) {
        const kind = classifyError(e);
        if (kind === "auth" || kind === "credit" || (e as any).status === 404) {
          skipped.add(i);
          break;
        }
        throw new Error(
          `Key position ${i + 1} preflight failed. Check rate limits or model access.`,
        );
      }
    }
  }
  while (skipped.has(keyIndex)) keyIndex++;
  if (keyIndex >= all.length)
    throw new Error(
      "No key can access both configured models. Open a cached demo.",
    );
  setTracingExportApiKey(all[keyIndex]);
}
