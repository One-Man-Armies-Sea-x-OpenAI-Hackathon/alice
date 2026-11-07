"use client";
import { useEffect, useRef, useState } from "react";
import {
  type Campaign,
  type Result,
  type Event,
  type Audience,
  type Reaction,
  type Fix,
  pretty,
  tiers,
} from "@alice/contracts";
import { demos } from "@alice/contracts/src/demos";
import Map from "./Map";
import Dashboard from "./Dashboard";
type Run = {
  id: string;
  campaign: Campaign;
  result: Result;
  events: Event[];
  audience?: Audience;
  reactions: Reaction[];
  outcomes: any[];
  mock: boolean;
  replay: boolean;
  status: string;
  error?: string;
};
type Chat = {
  id: string;
  title: string;
  campaign: Campaign;
  runId?: string;
  demo?: string;
  status: string;
  messages: { role: string; text: string }[];
};
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function blank(): Campaign {
  return {
    ...clone(demos["langkah-run"]),
    id: crypto.randomUUID(),
    brand: "",
    product: "",
    notes: "",
    timing: "",
    channels: [],
    location: "",
    target_regions: [],
    outdoor_regions: [],
    variants: [
      {
        id: "A",
        label: "Direction A",
        headline: "",
        copy: "",
        visual_description: "",
        attachment_ids: [],
        ai_drafted: false,
      },
      {
        id: "B",
        label: "Direction B",
        headline: "",
        copy: "",
        visual_description: "",
        attachment_ids: [],
        ai_drafted: false,
      },
    ],
  };
}
const demoInfo = [
  [
    "langkah-run",
    "Independence, in every step.",
    "Langkah Run",
    "Compare · Cultural symbols",
    "↗",
  ],
  [
    "kopi-senja",
    "Which coffee story connects?",
    "Kopi Senja",
    "Compare · Everyday culture",
    "◒",
  ],
  [
    "ciliwung",
    "A banner that starts a conversation.",
    "Ciliwung clean-up",
    "Single · Activist campaign",
    "≈",
  ],
  [
    "tiket-ceria",
    "A holiday for everyone.",
    "Tiket Ceria",
    "Compare · Religious sensitivity",
    "✳",
  ],
];
export default function Alice() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [active, setActive] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [view, setView] = useState("chat");
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [running, setRunning] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [sidebar, setSidebar] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeAnswer, setFreeAnswer] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [attachments, setAttachments] = useState<
    { name: string; text: string }[]
  >([]);
  const [health, setHealth] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [skip, setSkip] = useState(false);
  const stream = useRef<EventSource | null>(null);
  const replayTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const currentId = useRef("");
  const latestRun = useRef<Run | null>(null);
  const attach = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let list: Chat[] = [];
    try {
      list = JSON.parse(localStorage.getItem("alice.chats") || "[]");
    } catch {}
    if (!list.length)
      list = ["langkah-run", "tiket-ceria", "ciliwung"].map((name, i) => ({
        id: `demo-${i}`,
        title: demos[name].brand,
        campaign: clone(demos[name]),
        demo: name,
        status: "done",
        messages: [],
      }));
    setChats(list);
    const c = blank();
    setCampaign(c);
    setActive(c.id);
    const t = localStorage.getItem("alice.theme") || "dark";
    setTheme(t);
    setLoaded(true);
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
    return () => {
      stream.current?.close();
      replayTimers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("alice.chats", JSON.stringify(chats));
  }, [chats, loaded]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (loaded) localStorage.setItem("alice.theme", theme);
  }, [theme, loaded]);
  useEffect(() => {
    scroll.current?.scrollTo({
      top: scroll.current.scrollHeight,
      behavior: "smooth",
    });
  }, [questions, busy]);
  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setToolsOpen(false);
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      fetch("/api/health")
        .then((r) => r.json())
        .then(setHealth)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [running]);
  const updateChat = (id: string, patch: Partial<Chat>) =>
    setChats((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const saveDraft = (c: Campaign) => {
    setChats((xs) => {
      const exists = xs.find((x) => x.id === active);
      return exists
        ? xs.map((x) => (x.id === active ? { ...x, campaign: c } : x))
        : [
            {
              id: active,
              title: c.brand || "New campaign",
              campaign: c,
              status: "idle",
              messages: [],
            },
            ...xs,
          ];
    });
  };
  const fresh = (draft?: Campaign) => {
    if (running) {
      setError("Finish or cancel the active run before opening a new chat.");
      return;
    }
    const c = draft ? { ...clone(draft), id: crypto.randomUUID() } : blank();
    setCampaign(c);
    setActive(c.id);
    setRun(null);
    setEvents([]);
    setView("chat");
    setQuestions([]);
    setAnswers({});
    setError("");
    setAttachments([]);
  };
  const loadChat = async (chat: Chat) => {
    if (running) {
      setError("Finish or cancel the active run before switching chats.");
      return;
    }
    setError("");
    setActive(chat.id);
    setCampaign(clone(chat.campaign));
    setQuestions([]);
    setAnswers({});
    setRun(null);
    setEvents([]);
    setBusy(true);
    try {
      if (chat.runId || chat.demo) {
        const response = await fetch(
          chat.runId ? `/api/runs/${chat.runId}` : `/api/demo/${chat.demo}`,
        );
        if (response.ok) {
          const next = await response.json();
          setRun(next);
          setEvents(next.events ?? []);
          if (next.status === "running") {
            setView("run");
            setRunning(true);
            const poll = setInterval(async () => {
              try {
                const updated = await (
                  await fetch(`/api/runs/${chat.runId}`)
                ).json();
                setEvents(updated.events ?? []);
                if (updated.status !== "running") {
                  clearInterval(poll);
                  setRun(updated);
                  setRunning(false);
                  if (updated.status === "done") setView("dashboard");
                  else {
                    setView("chat");
                    setError(updated.error || "Run interrupted");
                  }
                  updateChat(chat.id, { status: updated.status });
                }
              } catch {
                clearInterval(poll);
                setRunning(false);
                setView("chat");
                setError("Could not reconnect to this run.");
              }
            }, 1500);
          } else if (next.result) {
            setView("dashboard");
          } else {
            setView("chat");
            setError(
              next.error || "Run interrupted. Send the brief to try again.",
            );
          }
        } else {
          setView("chat");
          setError("This demo is not cached yet. Send its brief to run it.");
        }
      } else setView("chat");
    } catch {
      setError("Could not open this chat. Check the local services.");
    } finally {
      setBusy(false);
    }
  };
  async function start(c: Campaign) {
    setQuestions([]);
    setBusy(false);
    setRunning(true);
    setSkip(false);
    setReplaying(false);
    setEvents([]);
    setView("run");
    setError("");
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      currentId.current = body.run_id;
      updateChat(active, {
        status: "running",
        runId: body.run_id,
        campaign: c,
      });
      let receivedTerminal = false;
      const source = new EventSource(`/api/runs/${body.run_id}/stream`);
      stream.current = source;
      const finish = async () => {
        source.close();
        const response = await fetch(`/api/runs/${body.run_id}`);
        const next = await response.json();
        latestRun.current = next;
        setRun(next);
        setEvents(next.events ?? []);
        setRunning(false);
        if (next.status === "done") {
          setView("dashboard");
          updateChat(active, { status: "done" });
        } else {
          setError(next.error || "Run failed");
          setView("chat");
          updateChat(active, { status: "failed" });
        }
      };
      let nextEventAt = Date.now();
      let stageReadyAt = Date.now();
      for (const name of [
        "stage",
        "brief",
        "audience",
        "reaction",
        "spread",
        "rollup",
        "robustness",
        "baseline",
        "risk",
        "fix",
        "done",
        "error",
      ])
        source.addEventListener(name, (message) => {
          if (!("data" in message)) return;
          const e = JSON.parse((message as MessageEvent).data);
          if (name === "done" || name === "error") {
            receivedTerminal = true;
            source.close();
          }
          const now = Date.now();
          nextEventAt = Math.max(nextEventAt, now);
          if (name === "stage") {
            nextEventAt = Math.max(nextEventAt, stageReadyAt);
            stageReadyAt =
              nextEventAt +
              ([2300, 3000, 4200, 2500, 1900, 2700, 2000, 900][
                Number(e.data.index)
              ] ?? 300);
          }
          const timer = setTimeout(() => {
            setEvents((prev) => [...prev, e]);
            if (name === "done" || name === "error") void finish();
          }, nextEventAt - now);
          replayTimers.current.push(timer);
          if (name === "reaction" || name === "spread") nextEventAt += 120;
        });
      source.onerror = () => {
        if (receivedTerminal) return;
        source.close();
        const poll = setInterval(async () => {
          try {
            const response = await fetch(`/api/runs/${body.run_id}`);
            const next = await response.json();
            setEvents(next.events ?? []);
            if (next.status !== "running") {
              clearInterval(poll);
              void finish();
            }
          } catch {
            clearInterval(poll);
            setError(
              "Lost connection to the server. Reopen this chat when services return.",
            );
            setRunning(false);
            setView("chat");
          }
        }, 1500);
      };
    } catch (e) {
      setRunning(false);
      setView("chat");
      setError(String(e));
      updateChat(active, { status: "failed" });
    }
  }
  async function send() {
    if (!campaign) return;
    if (!campaign.notes.trim()) {
      setError("Add a brief before sending.");
      return;
    }
    if (campaign.variants.some((v) => !v.headline.trim() && !v.copy.trim())) {
      setError("Add a headline or copy for each variant.");
      return;
    }
    setError("");
    setBusy(true);
    const c = {
      ...campaign,
      brand:
        campaign.brand ||
        campaign.notes.match(/Brand:\s*([^.,\n]+)/i)?.[1] ||
        "New campaign",
      notes:
        campaign.notes +
        attachments.map((a) => `\n\nAttachment ${a.name}:\n${a.text}`).join(""),
    };
    setCampaign(c);
    saveDraft(c);
    setChats((xs) =>
      xs.map((x) =>
        x.id === active
          ? {
              ...x,
              title: c.brand,
              messages: [...x.messages, { role: "user", text: c.notes }],
            }
          : x,
      ),
    );
    try {
      const response = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: c, answers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setCampaign(body.campaign);
      if (body.ready) await start(body.campaign);
      else {
        setQuestions(body.questions);
        updateChat(active, { status: "waiting", campaign: body.campaign });
        setBusy(false);
      }
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }
  async function answer(value: string) {
    if (!value.trim() || !campaign) return;
    const q = questions.find((q) => !answers[q.id]);
    if (!q) return;
    const next: Record<string, string> = { ...answers, [q.id]: value };
    setAnswers(next);
    setFreeAnswer("");
    if (questions.some((q) => !next[q.id])) return;
    setBusy(true);
    try {
      const response = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign, answers: next }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setCampaign(body.campaign);
      await start(body.campaign);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }
  function replay() {
    if (!run) return;
    setEvents([]);
    setView("run");
    setRunning(true);
    setReplaying(true);
    setSkip(false);
    let previous = 0;
    let elapsed = 0;
    run.events.forEach((e, i) => {
      const delta = Math.max(0, e.time_ms - previous);
      previous = e.time_ms;
      elapsed += delta;
      const timer = setTimeout(() => {
        setEvents((xs) => [...xs, e]);
        if (i === run.events.length - 1) {
          setRunning(false);
          setView("dashboard");
        }
      }, elapsed);
      replayTimers.current.push(timer);
    });
  }
  async function cancel() {
    replayTimers.current.forEach(clearTimeout);
    stream.current?.close();
    if (!replaying && currentId.current)
      await fetch(`/api/runs/${currentId.current}`, { method: "DELETE" });
    setRunning(false);
    setView("chat");
    updateChat(active, { status: "idle" });
    setError(replaying ? "Replay closed." : "Run cancelled.");
  }
  async function files(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) {
      if (!/\.(txt|md|csv)$/i.test(file.name)) {
        setError("Attach text, Markdown or CSV files only.");
        continue;
      }
      if (file.size > 100000) {
        setError("Keep each attachment under 100 KB.");
        continue;
      }
      setAttachments((xs) => [...xs, { name: file.name, text: "" }]);
      const text = await file.text();
      setAttachments((xs) =>
        xs.map((x) => (x.name === file.name ? { name: x.name, text } : x)),
      );
    }
  }
  if (!campaign) return <main className="loading">Preparing Alice…</main>;
  const c = campaign;
  const currentChat = chats.find((x) => x.id === active);
  const lastStage = events.filter((e) => e.type === "stage").at(-1);
  const stageName = String(lastStage?.data.id ?? "Reading the brief");
  const audience = events.find((e) => e.type === "audience")
    ?.data as unknown as Audience | undefined;
  const reactionEvents = events.filter((e) => e.type === "reaction");
  const spread = events.filter((e) => e.type === "spread").at(-1);
  const archetypes = tiers[c.depth].archetypes;
  const calls =
    archetypes * (c.variants.length + (c.variants.length > 1 ? 1 : 0)) +
    8 +
    (c.tools.risk && c.tools.rewrite
      ? 2 * (archetypes + 2) * Math.min(3, c.variants.length)
      : 0);
  const question = questions.find((q) => !answers[q.id]);
  return (
    <div className="app">
      <aside className={`sidebar ${sidebar ? "open" : "closed"}`}>
        <div className="brand">
          <Logo />
          <strong>ALICE</strong>
          <button
            className="icon-button"
            onClick={() => setSidebar(false)}
            aria-label="Collapse sidebar"
          >
            ⇤
          </button>
        </div>
        <button className="new-chat" onClick={() => fresh()}>
          <span>＋</span> New chat <kbd>↗</kbd>
        </button>
        <div className="sidebar-label">
          Your conversations <span>{chats.length}</span>
        </div>
        <div className="chat-list">
          {chats.map((chat) => (
            <div
              className={`chat-row ${active === chat.id ? "active" : ""}`}
              key={chat.id}
            >
              <button onClick={() => loadChat(chat)}>
                <span className={`status ${chat.status}`} />
                <span>{chat.title}</span>
                {chat.demo && <small>Demo</small>}
              </button>
              <button
                className="delete-chat"
                aria-label={`Delete ${chat.title}`}
                onClick={() => {
                  setChats((xs) => xs.filter((x) => x.id !== chat.id));
                  if (active === chat.id) fresh();
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="sidebar-note">
          <span className="mini-globe">◎</span>
          <p>
            Built for the nuances
            <br />
            of Indonesia.
          </p>
          <small>7 regions. Many perspectives.</small>
        </div>
        <div className="user">
          <span className="avatar">D</span>
          <div>
            <strong>Demo user</strong>
            <small>Hackathon workspace</small>
          </div>
          <button
            aria-label="Toggle color theme"
            className="icon-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            {!sidebar && (
              <button
                className="icon-button"
                aria-label="Open sidebar"
                onClick={() => setSidebar(true)}
              >
                ☰
              </button>
            )}
            <input
              aria-label="Chat title"
              value={currentChat?.title ?? c.brand ?? "New campaign"}
              placeholder="New campaign"
              onChange={(e) => {
                if (!currentChat) saveDraft(c);
                updateChat(active, { title: e.target.value });
              }}
            />
            <span className="topbar-slash">/</span>
            <span className="muted">Campaign lab</span>
          </div>
          <div className="actions">
            {run && (
              <div className="segmented">
                <button
                  className={view === "chat" ? "active" : ""}
                  onClick={() => setView("chat")}
                >
                  Chat
                </button>
                <button
                  className={view === "dashboard" ? "active" : ""}
                  onClick={() => setView("dashboard")}
                >
                  Dashboard
                </button>
              </div>
            )}
            {view === "dashboard" && <button onClick={replay}>↺ Replay</button>}
            <span className={`connection ${health?.ok ? "good" : "warn"}`}>
              ●{" "}
              <span>
                {health?.mock
                  ? "Mock mode"
                  : health?.ok
                    ? "Live workspace"
                    : "Connecting"}
              </span>
            </span>
          </div>
        </header>
        {health?.pool?.last_key && health.pool.total > 1 && (
          <div className="key-warning">
            ! Using key position {health.pool.position} of {health.pool.total},
            the reserved demo key.
          </div>
        )}
        {error && (
          <div role="alert" className="error toast">
            ! {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        <main
          ref={scroll}
          className={view === "chat" ? "chat-main" : "content-main"}
        >
          {view === "dashboard" && run?.result && (
            <Dashboard
              run={run}
              onReplay={replay}
              onUpdate={setRun}
              onAccept={(f) => {
                const draft = clone(run.campaign);
                draft.variants = draft.variants.map((v) =>
                  v.id === f.variant_id
                    ? {
                        ...v,
                        headline: f.rewrite.headline,
                        copy: f.rewrite.copy,
                        visual_description: f.rewrite.visual,
                      }
                    : v,
                );
                fresh(draft);
              }}
            />
          )}
          {view === "run" && (
            <div className="run-view enter">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    {replaying
                      ? "Cached replay"
                      : "A synthetic audience, a new perspective"}
                  </span>
                  <h1>
                    {replaying ? "Replaying" : "Simulating"} {c.brand}
                  </h1>
                  <p>
                    {tiers[c.depth].personas.toLocaleString()} agents ·{" "}
                    {c.variants.length} variants · {pretty(c.depth)} · Seed{" "}
                    {c.seed}
                    {health?.mock ? " · Mock data" : ""}
                  </p>
                </div>
                <div className="actions">
                  <button
                    onClick={() => {
                      if (replaying) {
                        replayTimers.current.forEach(clearTimeout);
                        setRunning(false);
                        setView("dashboard");
                      } else if (run?.status === "done") {
                        setView("dashboard");
                      } else {
                        setSkip(true);
                      }
                    }}
                  >
                    Skip to dashboard
                  </button>
                  <button onClick={cancel}>
                    {replaying ? "Close" : "Cancel"}
                  </button>
                </div>
              </div>
              <div className="stage-stepper">
                {[
                  "Brief",
                  "Audience",
                  "Reactions",
                  "Spread",
                  "Results",
                  ...(c.tools.risk ? ["Risk scan"] : []),
                  ...(c.tools.risk && c.tools.rewrite ? ["Fixes"] : []),
                ].map((s, i) => (
                  <div
                    key={s}
                    className={
                      Number(lastStage?.data.index ?? 0) >= i ? "active" : ""
                    }
                  >
                    <span>
                      {Number(lastStage?.data.index ?? 0) > i ? "✓" : i + 1}
                    </span>
                    {s}
                  </div>
                ))}
              </div>
              <div className="run-grid">
                <section className="panel run-map">
                  <div className="panel-heading">
                    <h3>
                      <span className="pulse-dot" /> {stageName}
                    </h3>
                    <span className="tag">
                      {replaying ? "Replay" : "Same audience · every variant"}
                    </span>
                  </div>
                  <Map
                    personas={audience?.personas}
                    sentiments={audience?.archetypes.map((a) => {
                      const e = reactionEvents.find(
                        (e) => e.data.archetype_id === a.id,
                      );
                      return (
                        e?.data.per_variant as Reaction[] | undefined
                      )?.[0]?.sentiment;
                    })}
                    stage={stageName}
                    exposed={events
                      .filter(
                        (e) =>
                          e.type === "spread" &&
                          e.data.variant_id === spread?.data.variant_id,
                      )
                      .flatMap((e) => e.data.newly_exposed as number[])}
                    edges={spread?.data.edges as any}
                  />
                  <div className="legend">
                    <span className="good">■ Positive</span>
                    <span className="warn">■ Neutral</span>
                    <span className="bad">■ Negative / objection</span>
                    <span>□ Not reached</span>
                  </div>
                </section>
                <div>
                  <section className="panel live-feed">
                    <div className="panel-heading">
                      <h3>From the audience</h3>
                      <span className="tag">Synthetic voices</span>
                    </div>
                    {reactionEvents.length ? (
                      reactionEvents
                        .slice(-5)
                        .reverse()
                        .map((e) => (
                          <article className="enter" key={e.seq}>
                            <div className="eyebrow">
                              {String(e.data.label)}
                            </div>
                            <p>“{String(e.data.comment)}”</p>
                            <small>
                              {String(e.data.count)} agents represented
                            </small>
                          </article>
                        ))
                    ) : (
                      <div className="waiting">
                        <span className="typing">● ● ●</span>
                        <p>Alice is preparing the audience.</p>
                      </div>
                    )}
                  </section>
                  <section className="panel telemetry">
                    <h3>Inside the simulation</h3>
                    <div>
                      <span>Agents</span>
                      <strong>
                        {audience?.personas.count.toLocaleString() ?? "—"}
                      </strong>
                    </div>
                    <div>
                      <span>Reaction calls returned</span>
                      <strong>
                        {reactionEvents.reduce(
                          (n, e) => n + (e.data.per_variant as any[]).length,
                          0,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Archetypes</span>
                      <strong>{audience?.archetypes.length ?? "—"}</strong>
                    </div>
                    <div>
                      <span>Spread tick</span>
                      <strong>{String(spread?.data.tick ?? "—")}</strong>
                    </div>
                    <div>
                      <span>Exposed share</span>
                      <strong>
                        {spread
                          ? `${Math.round(Number(spread.data.share_reached) * 100)}%`
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span>Objections</span>
                      <strong>
                        {String(spread?.data.objected_count ?? "—")}
                      </strong>
                    </div>
                  </section>
                </div>
              </div>
              {skip && (
                <p className="muted">
                  The run is still working. The dashboard will open as soon as
                  results are ready.
                </p>
              )}
            </div>
          )}
          {view === "chat" && (
            <div className="chat-content">
              <div className="welcome">
                <div className="hero-logo">
                  <Logo />
                </div>
                <span className="eyebrow">
                  A little foresight. A better first impression.
                </span>
                <h1>What are we testing today?</h1>
                <p>
                  See how your next campaign might land across Indonesia.
                  <br />
                  Explore reactions, spot cultural risks, and find a stronger
                  direction.
                </p>
              </div>
              <div className="demo-grid">
                {demoInfo.map(([id, title, brand, tags, icon]) => (
                  <button
                    key={id}
                    className="demo-card"
                    onClick={() => {
                      setCampaign(clone(demos[id]));
                      setQuestions([]);
                      setAnswers({});
                      setError("");
                    }}
                  >
                    <div className="demo-icon">{icon}</div>
                    <span className="eyebrow">{brand}</span>
                    <h3>{title}</h3>
                    <span className="demo-tags">
                      {tags} <span>↗</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="flow-strip">
                {["Brief", "Clarify", "Simulate", "Decide"].map((s, i) => (
                  <span key={s}>
                    <b>0{i + 1}</b>
                    {s}
                    {i < 3 && <i>⟶</i>}
                  </span>
                ))}
              </div>
              {currentChat?.messages.map((m, i) => (
                <div className="user-message" key={i}>
                  <span>{m.text}</span>
                </div>
              ))}
              {questions.length > 0 && (
                <div className="clarify-thread">
                  <div className="assistant-heading">
                    <Logo />
                    <span>
                      I read {c.variants.length} variants for {c.brand}. Let’s
                      lock in the context.
                    </span>
                  </div>
                  {questions
                    .filter((q) => answers[q.id] || q.id === question?.id)
                    .map((q) => (
                      <section className="panel question" key={q.id}>
                        <span className="eyebrow">
                          A detail that changes the simulation
                        </span>
                        <h3>{q.text}</h3>
                        <div className="option-chips">
                          {q.options.map((option: string) => (
                            <button
                              key={option}
                              disabled={!!answers[q.id]}
                              className={
                                answers[q.id] === option ? "active" : ""
                              }
                              onClick={() => answer(option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {answers[q.id] ? (
                          <p className="good">✓ {answers[q.id]}</p>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              answer(freeAnswer);
                            }}
                          >
                            <input
                              aria-label="Custom clarification answer"
                              value={freeAnswer}
                              onChange={(e) => setFreeAnswer(e.target.value)}
                              placeholder="Or type your own answer…"
                            />
                            <button disabled={!freeAnswer.trim()}>
                              Continue →
                            </button>
                          </form>
                        )}
                      </section>
                    ))}
                </div>
              )}
              {busy && (
                <div className="assistant-heading">
                  <Logo />
                  <span className="typing">Reading the brief ● ● ●</span>
                </div>
              )}
              <section
                className="composer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  files(e.dataTransfer.files);
                }}
              >
                <div className="composer-header">
                  <div className="segmented">
                    <button
                      className={c.variants.length === 1 ? "active" : ""}
                      onClick={() =>
                        setCampaign({ ...c, variants: [c.variants[0]] })
                      }
                    >
                      Single campaign
                    </button>
                    <button
                      className={c.variants.length > 1 ? "active" : ""}
                      onClick={() =>
                        setCampaign({
                          ...c,
                          variants:
                            c.variants.length > 1
                              ? c.variants
                              : [
                                  ...c.variants,
                                  {
                                    ...clone(c.variants[0]),
                                    id: "B",
                                    label: "Direction B",
                                    headline: "",
                                    copy: "",
                                    visual_description: "",
                                  },
                                ],
                        })
                      }
                    >
                      Compare campaigns
                    </button>
                  </div>
                  <label className="brand-field">
                    Brand{" "}
                    <input
                      value={c.brand}
                      placeholder="Your brand"
                      onChange={(e) =>
                        setCampaign({ ...c, brand: e.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="variant-tray">
                  {c.variants.map((v, i) => (
                    <div className="variant-card" key={v.id}>
                      <div>
                        <span
                          style={{
                            color: `var(--variant-${v.id.toLowerCase()})`,
                          }}
                        >
                          ●
                        </span>
                        <input
                          aria-label={`Variant ${v.id} label`}
                          value={v.label}
                          onChange={(e) =>
                            setCampaign({
                              ...c,
                              variants: c.variants.map((x, j) =>
                                j === i ? { ...x, label: e.target.value } : x,
                              ),
                            })
                          }
                        />
                        <b>{v.id}</b>
                        {c.variants.length > 2 && (
                          <button
                            aria-label={`Remove variant ${v.id}`}
                            onClick={() =>
                              setCampaign({
                                ...c,
                                variants: c.variants
                                  .filter((_, j) => j !== i)
                                  .map((x, j) => ({
                                    ...x,
                                    id: ["A", "B", "C"][j] as any,
                                  })),
                              })
                            }
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <textarea
                        aria-label={`Variant ${v.id} headline`}
                        placeholder="Headline in Indonesian…"
                        value={v.headline}
                        onChange={(e) =>
                          setCampaign({
                            ...c,
                            variants: c.variants.map((x, j) =>
                              j === i ? { ...x, headline: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <textarea
                        aria-label={`Variant ${v.id} copy`}
                        placeholder="Campaign copy…"
                        value={v.copy}
                        onChange={(e) =>
                          setCampaign({
                            ...c,
                            variants: c.variants.map((x, j) =>
                              j === i ? { ...x, copy: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label={`Variant ${v.id} visual idea`}
                        placeholder="Visual idea (text description)"
                        value={v.visual_description}
                        onChange={(e) =>
                          setCampaign({
                            ...c,
                            variants: c.variants.map((x, j) =>
                              j === i
                                ? { ...x, visual_description: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                  {c.variants.length === 2 && (
                    <button
                      className="add-variant"
                      onClick={() =>
                        setCampaign({
                          ...c,
                          variants: [
                            ...c.variants,
                            {
                              ...clone(c.variants[0]),
                              id: "C",
                              label: "Direction C",
                              headline: "",
                              copy: "",
                              visual_description: "",
                            },
                          ],
                        })
                      }
                    >
                      ＋<span>Add variant</span>
                    </button>
                  )}
                </div>
                <textarea
                  className="brief-input"
                  aria-label="Campaign brief"
                  placeholder="Tell Alice about your campaign. The audience, the goal, the moment…"
                  value={c.notes}
                  onChange={(e) => setCampaign({ ...c, notes: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!busy && !running) send();
                    }
                  }}
                />
                {attachments.length > 0 && (
                  <div className="tags">
                    {attachments.map((a, i) => (
                      <span key={i}>
                        ▤ {a.name}
                        <button
                          aria-label={`Remove ${a.name}`}
                          onClick={() =>
                            setAttachments((xs) => xs.filter((_, j) => j !== i))
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="composer-bottom">
                  <div className="actions">
                    <button
                      className="icon-button"
                      aria-label="Attach text file"
                      onClick={() => attach.current?.click()}
                    >
                      ＋
                    </button>
                    <input
                      ref={attach}
                      hidden
                      type="file"
                      accept=".txt,.md,.csv"
                      multiple
                      onChange={(e) => files(e.target.files)}
                    />
                    <div className="tools-wrap">
                      <button onClick={() => setToolsOpen(!toolsOpen)}>
                        ⚙ Tools{" "}
                        <span className="count">
                          {1 + Object.values(c.tools).filter(Boolean).length}
                        </span>
                      </button>
                      {toolsOpen && (
                        <div className="tools-popover">
                          <h3>Give Alice the right tools.</h3>
                          <div>
                            <span>
                              Persona swarm
                              <small>
                                A shared synthetic audience for every variant
                              </small>
                            </span>
                            <span>Always on</span>
                          </div>
                          {(["risk", "calendar", "rewrite"] as const).map(
                            (key) => (
                              <label key={key}>
                                <span>
                                  {
                                    {
                                      risk: "Risk & SARA scan",
                                      calendar: "Cultural calendar",
                                      rewrite: "Auto-rewrite fixes",
                                    }[key]
                                  }
                                  <small>
                                    {
                                      {
                                        risk: "Find sensitive cultural and reputational risks",
                                        calendar:
                                          "Include season and timing in the context",
                                        rewrite:
                                          "Draft and re-test safer alternatives",
                                      }[key]
                                    }
                                  </small>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={c.tools[key]}
                                  onChange={(e) =>
                                    setCampaign({
                                      ...c,
                                      tools: {
                                        ...c.tools,
                                        [key]: e.target.checked,
                                      },
                                    })
                                  }
                                />
                              </label>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                    <select
                      aria-label="Simulation depth"
                      value={c.depth}
                      onChange={(e) =>
                        setCampaign({ ...c, depth: e.target.value as any })
                      }
                    >
                      {Object.entries(tiers).map(([id, t]) => (
                        <option key={id} value={id}>
                          {pretty(id)} · {t.personas.toLocaleString()} agents ·{" "}
                          {t.archetypes} archetypes
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="actions">
                    <span className="estimate">
                      Up to {calls} calls · ~
                      {Math.ceil(
                        ((archetypes * c.variants.length) / 8) * 2.5 + 20,
                      )}
                      s{" "}
                      <small>
                        ~${(calls * 0.004).toFixed(2)} planning estimate
                      </small>
                    </span>
                    <button
                      aria-label="Send campaign"
                      className="send-button"
                      disabled={busy || running || !!question}
                      onClick={send}
                    >
                      ↑
                    </button>
                  </div>
                </div>
              </section>
              <div className="composer-disclaimer">
                <span>◈</span> Alice simulates audiences. Treat results as
                directional, not a forecast.
              </div>
            </div>
          )}
        </main>
        <div className="workspace-footer">
          <span>A clearer view before you go live.</span>
          <span>
            Made for Indonesia <span className="red-dot" />
          </span>
        </div>
      </div>
    </div>
  );
}
function Logo() {
  return (
    <img
      className="alice-logo"
      src="/alice-logo.png"
      alt="Alice"
      width={34}
      height={34}
    />
  );
}
