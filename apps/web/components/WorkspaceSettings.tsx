"use client";
import { useEffect, useState } from "react";
export default function WorkspaceSettings({
  user,
  onClose,
  onUpdate,
  children,
}: {
  user: { id: string; name: string; email: string; preferences?: any };
  onClose: () => void;
  onUpdate: (u: any) => void;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState("General");
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [pref, setPref] = useState({
    name: user.name,
    theme:
      user.preferences?.theme ||
      document.documentElement.dataset.theme ||
      "dark",
    depth: user.preferences?.depth || "quick",
    mode: user.preferences?.mode || "multiple",
    tools: user.preferences?.tools || {
      risk: true,
      calendar: true,
      rewrite: true,
    },
  });
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setError("Connection diagnostics are unavailable."));
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  async function save() {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const r = await fetch("/api/auth/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pref),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      onUpdate(body.user);
      setSaved("Saved. Simulation defaults apply to new conversations.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="panel workspace-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="settings-title">Settings</h2>
            <small>{user.email}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Close settings"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="settings-layout">
          <nav aria-label="Settings sections">
            {[
              "General",
              "Simulation",
              "Integrations",
              "Usage & limits",
              "Account",
            ].map((name) => (
              <button
                className={tab === name ? "selected" : ""}
                key={name}
                onClick={() => {
                  setTab(name);
                  setSaved("");
                  setError("");
                }}
              >
                {name}
              </button>
            ))}
          </nav>
          <div className="settings-content">
            {tab === "General" && (
              <>
                <h3>Workspace preferences</h3>
                <label>
                  Display name
                  <input
                    value={pref.name}
                    onChange={(e) => setPref({ ...pref, name: e.target.value })}
                    maxLength={80}
                  />
                </label>
                <label>
                  Appearance
                  <select
                    value={pref.theme}
                    onChange={(e) =>
                      setPref({ ...pref, theme: e.target.value })
                    }
                  >
                    <option value="dark">Dark · Burgundy</option>
                    <option value="light">Light · Cream</option>
                  </select>
                </label>
                <p className="muted">
                  Conversations and dashboard artifacts are stored privately in
                  your account.
                </p>
              </>
            )}
            {tab === "Simulation" && (
              <>
                <h3>Default simulation settings</h3>
                <label>
                  Audience depth
                  <select
                    value={pref.depth}
                    onChange={(e) =>
                      setPref({ ...pref, depth: e.target.value })
                    }
                  >
                    <option value="quick">
                      Quick · 500 individual personalities
                    </option>
                    <option value="standard">
                      Standard · 1,500 individual personalities
                    </option>
                  </select>
                </label>
                <label>
                  Campaign mode
                  <select
                    value={pref.mode}
                    onChange={(e) => setPref({ ...pref, mode: e.target.value })}
                  >
                    <option value="single">Single campaign</option>
                    <option value="multiple">Multiple campaigns</option>
                  </select>
                </label>
                <div className="settings-row">
                  <div>
                    <strong>Individual-personality simulation</strong>
                    <small>One model reaction per person and campaign.</small>
                  </div>
                  <span className="tag">Always on</span>
                </div>
                {(["risk", "calendar", "rewrite"] as const).map((key) => (
                  <label className="settings-row" key={key}>
                    <span>
                      {
                        {
                          risk: "Risk and effectiveness analysis",
                          calendar: "Cultural calendar context",
                          rewrite: "Automatic fixes with fresh reactions",
                        }[key]
                      }
                    </span>
                    <input
                      type="checkbox"
                      checked={pref.tools[key]}
                      onChange={(e) =>
                        setPref({
                          ...pref,
                          tools: { ...pref.tools, [key]: e.target.checked },
                        })
                      }
                    />
                  </label>
                ))}
              </>
            )}
            {tab === "Integrations" && (
              <>
                <h3>Connected services and tools</h3>
                <div className="settings-service">
                  <strong>OpenAI model provider</strong>
                  <span className={health?.pool?.total ? "good" : "warn"}>
                    {health?.pool?.total
                      ? "Configured on the server"
                      : "Not configured"}
                  </span>
                  <small>
                    Persona: {health?.models?.reaction ?? "Checking…"}
                    <br />
                    Analysis: {health?.models?.analysis ?? "Checking…"}
                  </small>
                </div>
                <div className="settings-service">
                  <strong>Simulation engine</strong>
                  <span className={health?.core?.ok ? "good" : "warn"}>
                    {health?.core?.ok ? "Connected" : "Checking…"}
                  </span>
                  <small>
                    Rust · deterministic audience, geographic network and
                    aggregation
                  </small>
                </div>
                <div className="settings-service">
                  <strong>Account and artifact storage</strong>
                  <span>{health?.core?.storage ?? "Checking…"}</span>
                  <small>
                    Private conversations, sessions, results and artifact
                    revisions
                  </small>
                </div>
                <div className="settings-service">
                  <strong>Reference tools</strong>
                  <span className="tag">Available</span>
                  <small>
                    Text, Markdown and CSV briefs · PNG, JPEG and WebP visual
                    references
                  </small>
                </div>
              </>
            )}
            {tab === "Usage & limits" && (
              <>
                <h3>Usage and execution limits</h3>
                <div className="settings-row">
                  <span>Model-call hard cap per run</span>
                  <strong>
                    {health?.limits?.max_calls?.toLocaleString() ?? "Checking…"}
                  </strong>
                </div>
                <div className="settings-row">
                  <span>Concurrent model calls</span>
                  <strong>{health?.limits?.concurrency ?? "Checking…"}</strong>
                </div>
                <div className="settings-row">
                  <span>Current key position</span>
                  <strong>
                    {health?.pool?.position ?? "—"} of{" "}
                    {health?.pool?.total ?? "—"}
                  </strong>
                </div>
                <div className="settings-row">
                  <span>Estimated process spend</span>
                  <strong>
                    ${(health?.pool?.estimated_usd ?? 0).toFixed(3)}
                  </strong>
                </div>
                <p className="muted">
                  This is an estimate for the current server process, not the
                  account’s remaining credit. Model calls and time estimates are
                  shown before every run.
                </p>
                <a
                  className="settings-link"
                  href="https://platform.openai.com/settings/organization/billing"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open provider billing dashboard ↗
                </a>
              </>
            )}
            {tab === "Account" && children}
            {(tab === "General" || tab === "Simulation") && (
              <button className="primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save preferences"}
              </button>
            )}
            {saved && (
              <p className="good" role="status">
                {saved}
              </p>
            )}
            {error && (
              <p className="bad" role="alert">
                ! {error}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
