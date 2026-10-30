"use client";

import { useEffect, useRef, useState } from "react";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function LoginForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    const r = await post("/api/auth/send-otp", { email });
    setBusy(false);
    if (r.ok) {
      setStep("code");
      setDigits(Array(6).fill(""));
      setWait(60);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } else {
      setError(r.data.error ?? "Something went wrong. Try again.");
      if (r.data.retryAfter) {
        setWait(r.data.retryAfter);
        setStep("code");
      }
    }
  }

  async function verify(code: string) {
    setBusy(true);
    setError("");
    const r = await post("/api/auth/verify", { email, code });
    if (r.ok) {
      window.location.href = r.data.role === "admin" ? "/admin" : "/studio";
      return;
    }
    setBusy(false);
    setError(r.data.error ?? "That code didn't work.");
    setDigits(Array(6).fill(""));
    boxes.current[0]?.focus();
  }

  function setDigit(i: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    const next = [...digits];
    if (v.length > 1) {
      // pasted the whole code
      v.slice(0, 6).split("").forEach((d, k) => (next[k] = d));
      setDigits(next);
      boxes.current[Math.min(v.length, 5)]?.focus();
    } else {
      next[i] = v;
      setDigits(next);
      if (v && i < 5) boxes.current[i + 1]?.focus();
    }
    const code = next.join("");
    if (code.length === 6 && !busy) verify(code);
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="mt-8 flex flex-col gap-5">
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            placeholder="you@ds.study.iitm.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </label>
        {error ? <p className="err text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
        <button className="btn btn-brass" disabled={busy || !email}>{busy ? "Sending code…" : "Send code"}</button>
      </form>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-5">
      <p className="text-sm">
        Code sent to <strong>{email}</strong>.{" "}
        <button className="underline decoration-[var(--brass)] underline-offset-4" onClick={() => { setStep("email"); setError(""); }}>
          Change
        </button>
      </p>
      <div className="otp" role="group" aria-label="6-digit code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { boxes.current[i] = el; }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            value={d}
            disabled={busy}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
            }}
          />
        ))}
      </div>
      {error ? <p className="text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
      {busy ? <p className="muted text-sm">Checking…</p> : null}
      <button className="btn btn-ghost" disabled={wait > 0 || busy} onClick={() => sendCode()}>
        {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
      </button>
    </div>
  );
}
