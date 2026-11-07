"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
const Alice = dynamic(() => import("./Alice"), {
  loading: () => <main className="loading">Opening your workspace…</main>,
});
const WorkspaceSettings = dynamic(() => import("./WorkspaceSettings"));
type Profile = { id: string; email: string; name: string; preferences?: any };
export default function AuthGate() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "The server is unavailable. Start the complete stack.",
          );
        return r.json();
      })
      .then((x) => setUser(x.user))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setUser(body.user);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSettings(false);
  }
  async function password(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setMessage("Password updated. Other sessions have been signed out.");
      e.currentTarget?.reset();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("confirmation") !== "DELETE") {
      setError("Type DELETE to confirm account removal.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.get("password") }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setUser(null);
      setSettings(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return <main className="loading">Connecting to your workspace…</main>;
  if (!user)
    return (
      <main className="auth-page">
        <section className="auth-card panel">
          <Image
            src="/alice-logo.png"
            alt="Alice"
            width={96}
            height={96}
            priority
          />
          <h1>
            {register ? "Create your Alice account" : "Welcome back to Alice"}
          </h1>
          <p className="muted">
            A private workspace for your campaign conversations and simulation
            artifacts.
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  required
                />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 10 : 1}
                maxLength={256}
                required
              />
            </label>
            {register && <small>Use at least 10 characters.</small>}
            {error && (
              <p className="bad" role="alert">
                ! {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Please wait…" : register ? "Create account" : "Log in"}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Already have an account? Log in"
              : "New to Alice? Create an account"}
          </button>
        </section>
      </main>
    );
  return (
    <>
      <Alice
        key={user.id}
        user={user}
        onLogout={logout}
        onSettings={() => {
          setSettings(true);
          setError("");
          setMessage("");
        }}
      />
      {settings && (
        <WorkspaceSettings
          user={user}
          onUpdate={setUser}
          onClose={() => setSettings(false)}
        >
          <form onSubmit={password}>
            <h3>Change password</h3>
            <label>
              Current password
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              New password
              <input
                name="new_password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={256}
                required
              />
            </label>
            <button disabled={busy}>Update password</button>
          </form>
          {message && (
            <p className="good" role="status">
              {message}
            </p>
          )}
          <details className="delete-account">
            <summary>Delete account</summary>
            <p>
              This permanently removes your account, conversations, owned runs,
              results, recordings and private model cache. Other accounts are
              unaffected.
            </p>
            <form onSubmit={remove}>
              <label>
                Confirm your password
                <input type="password" name="password" required />
              </label>
              <label>
                Type DELETE
                <input name="confirmation" required />
              </label>
              <button className="danger" disabled={busy}>
                Permanently delete my account
              </button>
            </form>
          </details>
          {error && (
            <p className="bad" role="alert">
              ! {error}
            </p>
          )}
        </WorkspaceSettings>
      )}
    </>
  );
}
