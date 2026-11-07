"use client";
import type { ExternalContext } from "@alice/agents";

function safeUrl(raw: string) {
  try {
    const url = new URL(raw);
    return ["https:", "http:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
export default function ResearchCard({
  context: c,
  expanded = false,
}: {
  context: ExternalContext;
  expanded?: boolean;
}) {
  const date = new Date(c.retrieved_at);
  const cite = (url: string) => {
    const safe = safeUrl(url);
    if (!safe) return null;
    const source = c.sources.find((s) => s.url === url);
    return (
      <a href={safe.href} target="_blank" rel="noopener noreferrer">
        {source?.title || safe.hostname} ↗
      </a>
    );
  };
  return (
    <details className="research-card" open={expanded}>
      <summary>
        <span>
          <strong>External research</strong>
          <small>
            {c.status === "ready"
              ? `${c.facts.length} findings · ${c.sources.length} sources`
              : c.status === "needs_context"
                ? "More context needed"
                : c.status === "mock"
                  ? "Mock · no live search"
                  : c.status === "offline"
                    ? "Offline replay"
                    : "Sources unavailable"}
          </small>
        </span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="research-body">
        <p>{c.summary}</p>
        <p className="muted">
          As of{" "}
          {Number.isNaN(date.getTime())
            ? "unknown"
            : date.toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
          · {c.window_days}-day planning horizon
        </p>
        {c.facts.length > 0 && (
          <section>
            <h4>Sourced findings</h4>
            <ul>
              {c.facts.map((f, i) => (
                <li key={i}>
                  <span className="eyebrow">{f.kind.replaceAll("_", " ")}</span>
                  <p>{f.claim}</p>
                  {cite(f.source_url)}
                  <small>
                    {f.published_date && `Published ${f.published_date}`}
                    {f.published_date && f.event_date && " · "}
                    {f.event_date && `Event / effective date ${f.event_date}`}
                    {!f.published_date &&
                      !f.event_date &&
                      "Source date not established"}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        )}
        {c.opportunities.length > 0 && (
          <section>
            <h4>Campaign hypotheses</h4>
            <p className="muted">
              Ideas to test, not predictions of the brand’s plans or outcomes.
            </p>
            <ul>
              {c.opportunities.map((o, i) => (
                <li key={i}>
                  <p>{o.idea}</p>
                  <small>
                    Assumes:{" "}
                    {o.assumptions.join("; ") || "Further context is needed."}
                  </small>
                  {o.evidence_urls.map((url) => (
                    <div key={url}>{cite(url)}</div>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}
        {c.missing_data.length > 0 && (
          <section>
            <h4>Still needed</h4>
            <ul>
              {c.missing_data.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>
        )}
        {c.sources.length > 0 && (
          <details>
            <summary>All consulted sources ({c.sources.length})</summary>
            <ul>
              {c.sources.map((s) => (
                <li key={s.url}>{cite(s.url)}</li>
              ))}
            </ul>
          </details>
        )}
        <small className="muted">
          {c.model_calls} research model calls · {c.search_calls} search tool
          uses · ~${c.estimated_usd.toFixed(3)} estimated usage. Cached results
          may use no new calls.
        </small>
      </div>
    </details>
  );
}
