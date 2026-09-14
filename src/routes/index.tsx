import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { getGateStatus, unlockPortal } from "@/lib/gate.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vault Portal — Enter PIN" },
      { name: "description", content: "Secure website management portal. Enter your access PIN." },
      { property: "og:title", content: "Vault Portal — Enter PIN" },
      { property: "og:description", content: "Secure website management portal. Enter your access PIN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async () => {
    const status = await getGateStatus();
    if (status.unlocked) throw redirect({ to: "/websites" });
    return status;
  },
  component: UnlockPage,
});

function UnlockPage() {
  const initial = Route.useLoaderData();
  const router = useRouter();
  const unlock = useServerFn(unlockPortal);
  const [pin, setPin] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(initial.attemptsLeft);
  const [lockedOut, setLockedOut] = useState(initial.lockedOut);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || lockedOut) return;
    setBusy(true); setError(null);
    try {
      const res = await unlock({ data: { pin } });
      if (res.ok) {
        await router.navigate({ to: "/websites" });
        return;
      }
      setAttemptsLeft(res.attemptsLeft);
      setLockedOut(res.lockedOut);
      setPin("");
      setError(res.lockedOut
        ? "Too many wrong attempts. Access blocked."
        : `Incorrect PIN. ${res.attemptsLeft} attempt${res.attemptsLeft === 1 ? "" : "s"} left.`);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-background to-sidebar p-6">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Vault Portal</h1>
              <p className="text-xs text-muted-foreground">Enter your 6-digit access PIN</p>
            </div>
          </div>

          {lockedOut ? (
            <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 flex gap-3 items-start">
              <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-danger mb-1">Access blocked</div>
                <p className="text-muted-foreground">You entered the wrong PIN 3 times. Further attempts are disabled for this session.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="pin" className="block text-xs font-medium text-muted-foreground mb-2">Access PIN</label>
                <input
                  ref={inputRef}
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••"
                />
              </div>
              {error && <div className="text-sm text-danger">{error}</div>}
              <button
                type="submit"
                disabled={busy || pin.length !== 6}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {busy ? "Verifying…" : "Unlock portal"}
              </button>
              <div className="text-[11px] text-muted-foreground text-center">
                {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining before lockout
              </div>
            </form>
          )}
        </div>
        <div className="text-center text-[11px] text-muted-foreground mt-4">Session locks after 8 hours of inactivity.</div>
      </div>
    </div>
  );
}
