"use client";
import AutoTextarea from "./AutoTextarea";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  type Campaign,
  type Result,
  type Event,
  type Audience,
  type Reaction,
  type Fix,
} from "@alice/contracts";
import { pretty, tiers, plannedCalls, plannedSeconds } from "../lib/display";
import { readJson, requestTask, pollTask } from "../lib/http";
import CampaignDirections from "./CampaignDirections";
import ResearchCard from "./ResearchCard";
import type { ExternalContext } from "@alice/agents";
import dynamic from "next/dynamic";
const Map = dynamic(() => import("./Map"), { ssr: false });
const Dashboard = dynamic(() => import("./Dashboard"), {
  loading: () => <p className="muted">Opening dashboard…</p>,
});
const ArtifactWorkspace = dynamic(() => import("./ArtifactWorkspace"));
type Run = {
  research?: ExternalContext;
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
  research?: ExternalContext;
  researchEnabled?: boolean;
  phase?: string;
  id: string;
  title: string;
  campaign: Campaign;
  runId?: string;
  taskId?: string;
  demo?: string;
  status: string;
  messages: { role: string; text: string }[];
  questions?: any[];
  answers?: Record<string, string>;
  draft?: string;
  error?: string;
};
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function blank(): Campaign {
  return {
    campaign_type: "business",
    objective: "",
    tools: { risk: true, calendar: true, rewrite: true },
    depth: "quick",
    seed: 42,
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
export default function Alice({
  user,
  onLogout,
  onSettings,
}: {
  user: { id: string; name: string; email: string; preferences?: any };
  onLogout: () => void;
  onSettings: () => void;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [active, setActive] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [briefInput, setBriefInput] = useState("");
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
  const [externalResearch, setExternalResearch] = useState(
    user.preferences?.external_research ?? true,
  );
  const [toolsOpen, setToolsOpen] = useState(false);
  const [attachments, setAttachments] = useState<
    { name: string; text: string }[]
  >([]);
  const [health, setHealth] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [skip, setSkip] = useState(false);
  const [liveSelected, setLiveSelected] = useState<number | null>(null);
  const stream = useRef<EventSource | null>(null);
  const replayTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const currentId = useRef("");
  const activeRef = useRef("");
  const chatsRef = useRef<Chat[]>([]);
  const viewerCleanup = useRef<() => void>(() => {});
  const deletedChats = useRef(new Set<string>());
  const pendingIntakes = useRef(new Set<string>());
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Chat | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [referencesReading, setReferencesReading] = useState<
    Record<string, boolean>
  >({});
  activeRef.current = active;
  chatsRef.current = chats;
  const attach = useRef<HTMLInputElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const saveQueue = useRef(Promise.resolve());
  const thread = useRef<HTMLDivElement>(null);
  const followConversation = useRef(false);
  useEffect(() => {
    fetch("/api/conversations")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load your conversations");
        return readJson(r);
      })
      .then((body) => {
        const restored: Chat[] = body.chats
          .filter((chat: Chat) => !chat.demo)
          .map((chat: Chat) =>
            chat.status === "preparing" && !chat.taskId
              ? {
                  ...chat,
                  status: "failed",
                  error:
                    "The brief request was interrupted. Send another message to continue.",
                }
              : chat,
          );
        setChats(restored);
        setLoaded(true);
        for (const chat of restored)
          if (chat.status === "preparing" && chat.taskId)
            void intake(
              chat.campaign,
              chat.id,
              chat.answers ?? {},
              chat.questions ?? [],
              chat.taskId,
            );
      })
      .catch((e) => {
        setError(e.message);
      });
    setSidebar(window.innerWidth >= 820);
    const c = blank();
    if (user.preferences) {
      c.depth = user.preferences.depth;
      c.tools = user.preferences.tools;
      if (user.preferences.mode === "single") c.variants = [c.variants[0]];
    }
    setCampaign(c);
    activeRef.current = c.id;
    setActive(c.id);
    const t = localStorage.getItem("alice.theme") || "dark";
    setTheme(t);
    fetch("/api/health")
      .then(readJson)
      .then(setHealth)
      .catch(() => {});
    return () => {
      viewerCleanup.current();
      replayTimers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      const payload = JSON.stringify({ chats });
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(async () => {
          await readJson(
            await fetch("/api/conversations", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: payload,
            }),
          );
        })
        .catch(() =>
          setError(
            "Conversation changes could not be saved. Please check your connection.",
          ),
        );
    }, 350);
    return () => clearTimeout(timer);
  }, [chats, loaded]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (loaded) localStorage.setItem("alice.theme", theme);
  }, [theme, loaded]);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [active, view]);
  useEffect(() => {
    if (view === "chat" && questions.length)
      scroll.current?.scrollTo({
        top: scroll.current.scrollHeight,
        behavior: "smooth",
      });
  }, [questions]);
  useEffect(() => {
    if (!followConversation.current) return;
    thread.current?.scrollTo({
      top: thread.current.scrollHeight,
      behavior: "smooth",
    });
    followConversation.current = false;
  }, [chats, questions, busy]);
  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setToolsOpen(false);
        setDirectionsOpen(false);
        setPendingDelete(null);
      }
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      fetch("/api/health")
        .then(readJson)
        .then(setHealth)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (!toolsOpen) return;
    const close = (e: PointerEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node))
        setToolsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [toolsOpen]);
  useEffect(() => {
    if (user.preferences?.theme) setTheme(user.preferences.theme);
  }, [user.preferences?.theme]);
  useEffect(() => {
    if (!loaded) return;
    let stopped = false;
    async function checkBackground() {
      const ids = chatsRef.current
        .filter((x) => x.runId && x.status === "running")
        .map((x) => x.runId!)
        .slice(0, 50);
      if (!ids.length) return;
      try {
        const body = await readJson(
          await fetch(`/api/runs?ids=${encodeURIComponent(ids.join(","))}`),
        );
        if (stopped) return;
        setChats((xs) => {
          let changed = false;
          const next = xs.map((x) => {
            const job = body.runs.find((r: any) => r.id === x.runId);
            if (!job || job.status === x.status) return x;
            changed = true;
            return { ...x, status: job.status, error: job.error };
          });
          return changed ? next : xs;
        });
      } catch {
        /* Active viewers reconnect independently; keep background jobs intact. */
      }
    }
    void checkBackground();
    const timer = setInterval(checkBackground, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [loaded]);
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
  function detachViewer() {
    viewerCleanup.current();
    replayTimers.current.forEach(clearTimeout);
    replayTimers.current = [];
    currentId.current = "";
    setRunning(false);
    setReplaying(false);
    setLiveSelected(null);
  }
  function stashActive() {
    if (
      !campaign ||
      (!campaign.brand &&
        !briefInput.trim() &&
        !chatsRef.current.some((x) => x.id === active))
    )
      return;
    const id = active;
    setChats((xs) => {
      const old = xs.find((x) => x.id === id);
      const next = {
        ...(old ?? {
          id,
          title: campaign.brand || "New campaign",
          status: "idle",
          messages: [],
        }),
        campaign,
        draft: briefInput,
        researchEnabled: externalResearch,
        questions,
        answers,
      };
      return old ? xs.map((x) => (x.id === id ? next : x)) : [next, ...xs];
    });
  }
  const fresh = (draft?: Campaign) => {
    stashActive();
    detachViewer();
    const c = draft ? { ...clone(draft), id: crypto.randomUUID() } : blank();
    if (!draft && user.preferences) {
      c.depth = user.preferences.depth;
      c.tools = user.preferences.tools;
      if (user.preferences.mode === "single") c.variants = [c.variants[0]];
    }
    activeRef.current = c.id;
    setCampaign(c);
    setBriefInput(
      (draft?.notes ?? "").replace(
        /\n*\[ALICE external context[^]*?\[End external context\]/g,
        "",
      ),
    );
    setExternalResearch(user.preferences?.external_research ?? true);
    setActive(c.id);
    setRun(null);
    setEvents([]);
    setView("chat");
    setBusy(false);
    setQuestions([]);
    setAnswers({});
    setError("");
    setAttachments([]);
    setDirectionsOpen(false);
  };
  function monitorRun(id: string, chatId: string, initial: Event[] = []) {
    viewerCleanup.current();
    currentId.current = id;
    setRunning(true);
    setView("run");
    setEvents(initial);
    let disposed = false,
      finishing = false;
    const source = new EventSource(
      `/api/runs/${id}/stream?after=${initial.at(-1)?.seq ?? 0}`,
    );
    stream.current = source;
    const seen = new Set(initial.map((e) => e.seq));
    let buffer: Event[] = [];
    const flush = setInterval(() => {
      if (!buffer.length) return;
      const next = buffer;
      buffer = [];
      if (activeRef.current === chatId && currentId.current === id)
        setEvents((xs) => [...xs, ...next]);
    }, 80);
    async function check() {
      if (disposed || finishing) return;
      try {
        const status = await readJson(await fetch(`/api/runs/${id}?summary=1`));
        if (disposed || status.status === "running") return;
        finishing = true;
        const next = await readJson<Run>(await fetch(`/api/runs/${id}`));
        updateChat(chatId, { status: next.status, error: next.error });
        if (
          disposed ||
          activeRef.current !== chatId ||
          currentId.current !== id
        )
          return;
        viewerCleanup.current();
        setRun(next);
        setEvents((xs) => [...xs, ...buffer]);
        setRunning(false);
        setView(next.result ? "dashboard" : "chat");
        if (!next.result)
          setError(
            next.error ||
              "The simulation stopped. You can send the brief again.",
          );
      } catch (e) {
        finishing = false;
        if (!disposed && activeRef.current === chatId)
          setError(
            e instanceof Error
              ? e.message
              : "Could not reconnect. The run continues in the background.",
          );
      }
    }
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
    ]) {
      source.addEventListener(name, (message) => {
        if (!("data" in message)) return;
        try {
          const e = JSON.parse((message as MessageEvent).data) as Event;
          if (seen.has(e.seq)) return;
          seen.add(e.seq);
          buffer.push(e);
          if (name === "done" || name === "error") void check();
        } catch {
          if (activeRef.current === chatId)
            setError("A progress update was interrupted. Reconnecting…");
        }
      });
    }
    const poll = setInterval(check, 2500);
    viewerCleanup.current = () => {
      disposed = true;
      source.close();
      clearInterval(poll);
      clearInterval(flush);
    };
    void check();
  }
  const loadChat = async (chat: Chat) => {
    stashActive();
    detachViewer();
    activeRef.current = chat.id;
    setActive(chat.id);
    setCampaign(clone(chat.campaign));
    setBriefInput(chat.draft ?? "");
    setExternalResearch(
      chat.researchEnabled ?? user.preferences?.external_research ?? true,
    );
    setQuestions(chat.questions ?? []);
    setAnswers(chat.answers ?? {});
    setRun(null);
    setEvents([]);
    setView("chat");
    setBusy(chat.status === "preparing");
    setError(chat.error ?? "");
    setAttachments([]);
    setDirectionsOpen(false);
    scroll.current?.scrollTo({ top: 0, behavior: "instant" });
    if (!chat.runId) return;
    try {
      const next = await readJson<Run>(
        await fetch(
          `/api/runs/${chat.runId}${chat.status === "running" ? "?recording=1" : ""}`,
        ),
      );
      if (activeRef.current !== chat.id) return;
      setBusy(false);
      setRun(next);
      currentId.current = next.id;
      updateChat(chat.id, { status: next.status, error: next.error });
      if (next.status === "running")
        monitorRun(next.id, chat.id, next.events ?? []);
      else {
        setView(next.result ? "dashboard" : "chat");
        if (!next.result)
          setError(
            next.error ||
              "This run was interrupted. Send the brief to try again.",
          );
      }
    } catch (e) {
      if (activeRef.current === chat.id) {
        setBusy(false);
        setError(
          e instanceof Error ? e.message : "Could not open this conversation.",
        );
      }
    }
  };
  async function start(
    c: Campaign,
    chatId = activeRef.current,
    researchId?: string,
  ) {
    if (deletedChats.current.has(chatId)) return;
    updateChat(chatId, {
      status: "running",
      questions: [],
      campaign: c,
      error: undefined,
      draft: "",
    });
    if (activeRef.current === chatId) {
      setQuestions([]);
      setBusy(false);
      setRunning(true);
      setSkip(false);
      setReplaying(false);
      setEvents([]);
      setView("run");
      setError("");
      setDirectionsOpen(false);
    }
    try {
      const body = await readJson(
        await fetch("/api/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...c,
            research_id:
              researchId ??
              chatsRef.current.find((x) => x.id === chatId)?.research?.id,
          }),
        }),
      );
      updateChat(chatId, { runId: body.run_id, status: "running" });
      if (deletedChats.current.has(chatId)) {
        await fetch(`/api/runs/${body.run_id}`, { method: "DELETE" });
        return;
      }
      if (activeRef.current === chatId) monitorRun(body.run_id, chatId);
    } catch (e) {
      const error =
        e instanceof Error ? e.message : "Could not start this run.";
      updateChat(chatId, { status: "failed", error });
      if (activeRef.current === chatId) {
        setRunning(false);
        setView("chat");
        setError(error);
      }
    }
  }
  async function removeChat(chat: Chat) {
    try {
      if (chat.runId && chat.status === "running")
        await readJson(
          await fetch(`/api/runs/${chat.runId}`, { method: "DELETE" }),
        );
      deletedChats.current.add(chat.id);
      if (activeRef.current === chat.id) {
        detachViewer();
        setCampaign(null);
        fresh();
      }
      setChats((xs) => xs.filter((x) => x.id !== chat.id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not remove the conversation.",
      );
    }
  }
  function applyReference(
    campaignId: string,
    variantId: string,
    description: string,
    filename: string,
  ) {
    const change = (c: Campaign) => ({
      ...c,
      variants: c.variants.map((v) =>
        v.id === variantId
          ? {
              ...v,
              visual_description: description,
              attachment_ids: [filename],
            }
          : v,
      ),
    });
    setCampaign((c) => (c?.id === campaignId ? change(c) : c));
    setChats((xs) =>
      xs.map((x) =>
        x.campaign.id === campaignId
          ? { ...x, campaign: change(x.campaign) }
          : x,
      ),
    );
  }
  async function intake(
    c: Campaign,
    chatId: string,
    confirmed: Record<string, string>,
    priorQuestions: any[] = [],
    taskId?: string,
  ) {
    if (pendingIntakes.current.has(chatId)) return;
    pendingIntakes.current.add(chatId);
    updateChat(chatId, {
      status: "preparing",
      error: undefined,
      phase: "Reading the brief",
    });
    const prior = chatsRef.current.find((x) => x.id === chatId);
    const onProgress = (phase: string) => updateChat(chatId, { phase });
    try {
      const body = taskId
        ? await pollTask({ task_id: taskId }, onProgress)
        : await requestTask(
            "/api/clarify",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campaign: c,
                answers: confirmed,
                research: prior?.researchEnabled ?? externalResearch,
                research_id: prior?.research?.id,
              }),
            },
            (taskId) => updateChat(chatId, { taskId }),
            onProgress,
          );
      if (deletedChats.current.has(chatId)) return;
      const qs = [
        ...priorQuestions,
        ...body.questions.filter(
          (q: any) => !priorQuestions.some((x) => x.id === q.id),
        ),
      ];
      updateChat(chatId, {
        taskId: undefined,
        phase: undefined,
        research: body.research ?? prior?.research,
        campaign: body.campaign,
        title: body.campaign.brand || "New campaign",
        questions: qs,
        answers: confirmed,
        status: body.ready ? "running" : "waiting",
      });
      if (activeRef.current === chatId) {
        followConversation.current = true;
        setCampaign(body.campaign);
        setQuestions(qs);
        setBusy(false);
      }
      if (body.ready)
        await start(
          body.campaign,
          chatId,
          body.research?.id ?? prior?.research?.id,
        );
    } catch (e) {
      const error =
        e instanceof Error ? e.message : "Could not read the brief.";
      updateChat(chatId, { status: "failed", error });
      if (activeRef.current === chatId) {
        setError(error);
        setBusy(false);
      }
    } finally {
      pendingIntakes.current.delete(chatId);
    }
  }
  async function send() {
    if (
      !campaign ||
      busy ||
      running ||
      campaign.variants.some((v) => referencesReading[`${campaign.id}:${v.id}`])
    )
      return;
    if (plannedCalls(campaign) > (health?.limits?.max_calls ?? 16000)) {
      setError(
        "This plan exceeds the simulation call budget. Reduce directions, choose Quick depth, or turn off automatic fixes. Your directions remain in the plan.",
      );
      return;
    }
    if (!briefInput.trim()) {
      setError("Add a brief before sending.");
      return;
    }
    const chatId = active;
    followConversation.current = true;
    const text =
      briefInput +
      attachments.map((a) => `\n\nAttachment ${a.name}:\n${a.text}`).join("");
    const c = {
      ...campaign,
      brand:
        campaign.brand ||
        briefInput.match(/Brand:\s*([^.,\n]+)/i)?.[1] ||
        "New campaign",
      notes: campaign.notes ? campaign.notes + "\n\n" + text : text,
    };
    setCampaign(c);
    setBriefInput("");
    setAttachments([]);
    setError("");
    setBusy(true);
    setChats((xs) => {
      const old = xs.find((x) => x.id === chatId);
      const next = {
        ...(old ?? { id: chatId, status: "preparing", messages: [] }),
        title: c.brand,
        campaign: c,
        status: "preparing",
        draft: "",
        researchEnabled: externalResearch,
        messages: [...(old?.messages ?? []), { role: "user", text }],
      };
      return old ? xs.map((x) => (x.id === chatId ? next : x)) : [next, ...xs];
    });
    await intake(c, chatId, answers);
  }
  async function answer(value: string) {
    if (!value.trim() || !campaign || busy) return;
    const q = questions.find((q) => !answers[q.id]);
    if (!q) return;
    const next: Record<string, string> = { ...answers, [q.id]: value };
    followConversation.current = true;
    setAnswers(next);
    setFreeAnswer("");
    setChats((xs) =>
      xs.map((x) =>
        x.id === active
          ? {
              ...x,
              answers: next,
              messages: [
                ...x.messages,
                { role: "assistant", text: q.text },
                { role: "user", text: value },
              ],
            }
          : x,
      ),
    );
    if (questions.some((q) => !next[q.id])) return;
    setBusy(true);
    await intake(campaign, active, next, questions);
  }
  async function replay() {
    if (!run) return;
    let recorded = run.events;
    if (!recorded.length) {
      try {
        const response = await fetch(`/api/runs/${run.id}?recording=1`);
        const full = await readJson(response);
        if (!response.ok) throw new Error(full.error);
        recorded = full.events;
        setRun(full);
      } catch (e) {
        setError(String(e));
        return;
      }
    }
    if (!recorded.length) {
      setError("No event recording is available for this run.");
      return;
    }
    setEvents([]);
    setView("run");
    setRunning(true);
    setReplaying(true);
    setSkip(false);
    let previous = 0;
    let elapsed = 0;
    recorded.forEach((e, i) => {
      const delta = Math.max(0, e.time_ms - previous);
      previous = e.time_ms;
      elapsed += delta;
      const timer = setTimeout(() => {
        setEvents((xs) => [...xs, e]);
        if (i === recorded.length - 1) {
          setRunning(false);
          setView("dashboard");
        }
      }, elapsed);
      replayTimers.current.push(timer);
    });
  }
  async function cancel() {
    try {
      if (!replaying && currentId.current)
        await readJson(
          await fetch(`/api/runs/${currentId.current}`, { method: "DELETE" }),
        );
      const wasReplay = replaying;
      detachViewer();
      setView("chat");
      if (!wasReplay) updateChat(active, { status: "cancelled" });
      setError(wasReplay ? "Replay closed." : "Run cancelled.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Cancellation failed. The run may still be working.",
      );
    }
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
  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await removeChat(pendingDelete);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
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
  const calls = plannedCalls(c);
  const callCap = health?.limits?.max_calls ?? 16000;
  const question = questions.find((q) => !answers[q.id]);
  return (
    <div className="app">
      <aside
        className={`sidebar ${sidebar ? "open" : "closed"}`}
        aria-hidden={!sidebar}
        inert={!sidebar}
      >
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
              <button aria-label={chat.title} onClick={() => loadChat(chat)}>
                <span
                  className={`chat-status-dot chat-status-${chat.status}`}
                  aria-hidden="true"
                />
                <span>{chat.title}</span>
                {[
                  "running",
                  "preparing",
                  "done",
                  "failed",
                  "interrupted",
                ].includes(chat.status) && (
                  <small className="chat-job-label">
                    {
                      (
                        {
                          running: "Running",
                          preparing: "Reading",
                          done: "Ready",
                          failed: "Failed",
                          interrupted: "Interrupted",
                        } as Record<string, string>
                      )[chat.status]
                    }
                  </small>
                )}
              </button>
              <button
                className="delete-chat"
                aria-label={`Delete ${chat.title}`}
                onClick={() => setPendingDelete(chat)}
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
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <button className="text-button" onClick={onSettings}>
              Account settings
            </button>
            <button className="text-button" onClick={onLogout}>
              Log out
            </button>
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
          </div>
          <div className="actions">
            {view === "chat" && !run?.result && (
              <button
                className="directions-toggle"
                aria-expanded={directionsOpen}
                onClick={() => setDirectionsOpen(!directionsOpen)}
              >
                Directions
              </button>
            )}
            {run?.result && (
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
        <div
          className={`workspace-body ${view === "chat" && !run?.result ? "with-directions" : ""}`}
        >
          <main
            ref={scroll}
            className={view === "chat" ? "chat-main" : "content-main"}
          >
            {view === "dashboard" && run?.result && (
              <Dashboard
                key={run.id}
                run={run}
                onDraft={fresh}
                onConversation={(messages) =>
                  updateChat(active, {
                    messages: [
                      {
                        role: "user",
                        text: c.notes.replace(
                          /\n*\[ALICE external context[^]*?\[End external context\]/g,
                          "",
                        ),
                      },
                      ...messages,
                    ],
                  })
                }
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
                      onAgentClick={setLiveSelected}
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
                      edges={
                        (spread?.data.edges ??
                          (audience as any)?.connections ??
                          []) as any
                      }
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
                          <LoadingDots />
                          <p>Alice is preparing the audience.</p>
                        </div>
                      )}
                    </section>
                    {liveSelected !== null && audience && (
                      <section className="panel live-inspector">
                        <div className="panel-heading">
                          <h3>Agent {liveSelected + 1}</h3>
                          <button
                            aria-label="Close agent inspector"
                            onClick={() => setLiveSelected(null)}
                          >
                            ×
                          </button>
                        </div>
                        <p>
                          {(() => {
                            const profile =
                              audience.archetypes[
                                audience.personas.archetype_index[liveSelected]
                              ];
                            return (
                              profile?.blurb ||
                              `Shares a model reaction with ${profile?.persona_count ?? 0} agents in archetype ${profile?.id}. The engine computes this agent’s own exposure and diffusion.`
                            );
                          })()}
                        </p>
                        {(() => {
                          const e = reactionEvents.find(
                            (e) =>
                              e.data.archetype_id ===
                              audience.archetypes[
                                audience.personas.archetype_index[liveSelected]
                              ]?.id,
                          );
                          const rs = e?.data.per_variant as
                            Reaction[] | undefined;
                          return rs ? (
                            <>
                              {rs.map((r) => (
                                <div key={r.variant_id}>
                                  <h4>Variant {r.variant_id}</h4>
                                  <blockquote>{r.sample_comment}</blockquote>
                                  <p>{r.reason}</p>
                                  <small>
                                    Attention {r.attention.toFixed(2)} ·
                                    Sentiment {r.sentiment.toFixed(2)} ·
                                    Backlash {r.backlash_risk.toFixed(2)}
                                  </small>
                                </div>
                              ))}
                            </>
                          ) : (
                            <p className="muted">
                              Awaiting this agent’s shared archetype reaction.
                            </p>
                          );
                        })()}
                      </section>
                    )}
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
                        <span>Model reaction profiles</span>
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
            {view === "chat" && run?.result && (
              <div className="chat-content">
                <div className="panel-heading">
                  <div>
                    <h1>{run.campaign.brand}</h1>
                    <p className="muted">
                      Continue the conversation. Your dashboard remains a
                      revisable artifact.
                    </p>
                  </div>
                  <button onClick={() => setView("dashboard")}>
                    Open dashboard artifact ↗
                  </button>
                </div>
                <ArtifactWorkspace
                  run={run}
                  onDraft={fresh}
                  onConversation={(messages) =>
                    updateChat(active, {
                      messages: [
                        {
                          role: "user",
                          text: c.notes.replace(
                            /\n*\[ALICE external context[^]*?\[End external context\]/g,
                            "",
                          ),
                        },
                        ...messages,
                      ],
                    })
                  }
                />
              </div>
            )}
            {view === "chat" && !run?.result && (
              <div className="chat-content draft-chat">
                <div className="conversation-thread" key={active} ref={thread}>
                  {!currentChat?.messages.length && (
                    <>
                      <div className="welcome">
                        <div className="hero-logo">
                          <Logo />
                        </div>
                        <span className="eyebrow">
                          A little foresight. A better first impression.
                        </span>
                        <h1>What are we testing today?</h1>
                        <p>
                          See how your next campaign might land across
                          Indonesia.
                          <br />
                          Explore reactions, spot cultural risks, and find a
                          stronger direction.
                        </p>
                      </div>
                      <div className="flow-strip">
                        {["Brief", "Clarify", "Simulate", "Decide"].map(
                          (s, i) => (
                            <span key={s}>
                              <b>0{i + 1}</b>
                              {s}
                              {i < 3 && <i>⟶</i>}
                            </span>
                          ),
                        )}
                      </div>
                    </>
                  )}
                  {currentChat?.messages.map((m, i) => (
                    <div
                      className={
                        m.role === "assistant"
                          ? "assistant-message"
                          : "user-message"
                      }
                      key={i}
                    >
                      <span>{m.text}</span>
                    </div>
                  ))}
                  {currentChat?.research && (
                    <ResearchCard context={currentChat.research} />
                  )}
                  {questions.length > 0 && (
                    <div className="clarify-thread">
                      <div className="assistant-heading">
                        <Logo />
                        <span>
                          I read {c.variants.length} directions for {c.brand}.
                          Let’s lock in the context.
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
                                <AutoTextarea
                                  aria-label="Custom clarification answer"
                                  value={freeAnswer}
                                  onChange={(e) =>
                                    setFreeAnswer(e.target.value)
                                  }
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
                      <span role="status">
                        {currentChat?.phase || "Reading the brief"}{" "}
                        <LoadingDots />
                      </span>
                    </div>
                  )}
                </div>
                <section
                  className="composer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    files(e.dataTransfer.files);
                  }}
                >
                  <AutoTextarea
                    className="brief-input"
                    aria-label="Campaign brief"
                    placeholder="Tell Alice about your campaign. The audience, the goal, the moment…"
                    value={briefInput}
                    onChange={(e) => setBriefInput(e.target.value)}
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
                              setAttachments((xs) =>
                                xs.filter((_, j) => j !== i),
                              )
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
                      <div className="tools-wrap" ref={toolsRef}>
                        <button
                          aria-expanded={toolsOpen}
                          aria-controls="campaign-tools"
                          onClick={() => setToolsOpen(!toolsOpen)}
                        >
                          ⚙ Tools{" "}
                          <span className="count">
                            {1 +
                              Number(externalResearch) +
                              Object.values(c.tools).filter(Boolean).length}
                          </span>
                        </button>
                        {toolsOpen && (
                          <div
                            id="campaign-tools"
                            className="tools-popover"
                            role="dialog"
                            aria-label="Campaign tools"
                          >
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
                            <label>
                              <span>
                                External research
                                <small>
                                  Current public sources before the planner
                                  responds. Adds up to 2 model calls and 2
                                  search tool uses; usage fees apply.
                                </small>
                              </span>
                              <input
                                type="checkbox"
                                checked={externalResearch}
                                onChange={(e) => {
                                  setExternalResearch(e.target.checked);
                                  updateChat(active, {
                                    researchEnabled: e.target.checked,
                                  });
                                }}
                              />
                            </label>
                            <p className="muted">
                              Search uses public brand and category terms.
                              Attachments stay out of web queries.
                            </p>
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
                            {pretty(id)} · {t.personas.toLocaleString()} agents
                            · {t.archetypes} archetypes
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="actions">
                      <span className="estimate">
                        ~{calls} calls · ~
                        {plannedSeconds(c, health?.limits?.concurrency ?? 8)}s{" "}
                        <small>
                          ~${(calls * 0.004).toFixed(2)} planning estimate
                        </small>
                      </span>
                      <button
                        aria-label="Send campaign"
                        className="send-button"
                        disabled={
                          busy ||
                          running ||
                          !!question ||
                          c.variants.some(
                            (v) => referencesReading[`${c.id}:${v.id}`],
                          )
                        }
                        onClick={send}
                      >
                        ↑
                      </button>
                    </div>
                  </div>
                </section>
                {calls > callCap && (
                  <p className="budget-note warn" role="status">
                    ! Planned {calls.toLocaleString()} calls exceed the{" "}
                    {callCap.toLocaleString()} cap. Reduce directions, depth or
                    automatic fixes before running.
                  </p>
                )}
                <div className="composer-disclaimer">
                  <span>◈</span> Alice simulates audiences. Treat results as
                  directional, not a forecast.
                </div>
              </div>
            )}
          </main>
          {view === "chat" && !run?.result && (
            <>
              {directionsOpen && (
                <button
                  className="directions-backdrop"
                  aria-label="Close campaign directions"
                  onClick={() => setDirectionsOpen(false)}
                />
              )}
              <CampaignDirections
                campaign={c}
                onChange={setCampaign}
                onReference={applyReference}
                onReferenceBusy={(campaignId, variantId, busy) =>
                  setReferencesReading((xs) => ({
                    ...xs,
                    [`${campaignId}:${variantId}`]: busy,
                  }))
                }
                disabled={busy || running}
                open={directionsOpen}
                onClose={() => setDirectionsOpen(false)}
              />
            </>
          )}
        </div>
        <div className="workspace-footer">
          <span>A clearer view before you go live.</span>
          <span>
            Made for Indonesia <span className="red-dot" />
          </span>
        </div>
      </div>
      {pendingDelete && (
        <div
          className="modal-backdrop"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <section
            className="panel delete-conversation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-conversation-title"
            aria-describedby="delete-conversation-description"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-conversation-title">Delete this conversation?</h2>
            <p id="delete-conversation-description">
              Remove “{pendingDelete.title}” from your conversation history. Any
              active simulation for it will be canceled.
            </p>
            <div className="actions">
              <button
                autoFocus
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
              >
                Keep conversation
              </button>
              <button
                className="danger"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? "Deleting…" : "Delete conversation"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Logo() {
  return (
    <Image
      sizes="104px"
      className="alice-logo"
      src="/alice-logo.png"
      alt="Alice"
      width={104}
      height={104}
    />
  );
}

function LoadingDots() {
  return (
    <span className="loading-dots" aria-hidden="true">
      <i>●</i>
      <i>●</i>
      <i>●</i>
    </span>
  );
}
