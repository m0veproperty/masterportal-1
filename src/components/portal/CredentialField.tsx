import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { revealCredential, revealGeneralCredential, logCopy } from "@/lib/portal.functions";

const CONCEAL_MS = 20000;

export function CredentialField({
  credentialId,
  generalCredentialId,
  field = "password",
  label = "Password",
  websiteId,
}: {
  credentialId?: string;
  generalCredentialId?: string;
  field?: "password" | "backup";
  label?: string;
  websiteId?: string;
}) {
  const reveal = useServerFn(revealCredential);
  const revealGeneral = useServerFn(revealGeneralCredential);
  const copyFn = useServerFn(logCopy);
  const [value, setValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const hide = () => {
    setValue(null);
    if (timer.current) window.clearTimeout(timer.current);
  };
  const showFor = (v: string) => {
    setValue(v);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setValue(null), CONCEAL_MS);
  };

  const onReveal = async () => {
    if (value) return hide();
    setLoading(true);
    try {
      const res = credentialId
        ? await reveal({ data: { id: credentialId } })
        : await revealGeneral({ data: { id: generalCredentialId!, field } });
      showFor(res.password);
    } finally { setLoading(false); }
  };

  const onCopy = async () => {
    setLoading(true);
    try {
      let v = value;
      if (!v) {
        const res = credentialId
          ? await reveal({ data: { id: credentialId } })
          : await revealGeneral({ data: { id: generalCredentialId!, field } });
        v = res.password;
      }
      if (!v) return;
      await navigator.clipboard.writeText(v);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      await copyFn({ data: { credential_id: credentialId, website_id: websiteId, label } });
    } finally { setLoading(false); }
  };

  return (
    <div className="flex items-center gap-1 group">
      <code className="flex-1 font-mono text-sm bg-muted rounded px-2 py-1 min-h-[28px]">
        {value ?? "••••••••••••"}
      </code>
      <button
        type="button" onClick={onReveal} disabled={loading}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
        aria-label={value ? "Hide" : "Show"}
      >
        {value ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      <button
        type="button" onClick={onCopy} disabled={loading}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
        aria-label="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
