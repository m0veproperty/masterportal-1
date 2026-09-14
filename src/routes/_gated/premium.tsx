import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/portal/AppShell";
import {
  listPremium,
  revealPremiumDomainCpanelPassword,
  updatePremiumDomain,
} from "@/lib/portal.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Copy, ExternalLink, Eye, Pencil } from "lucide-react";

const opts = queryOptions({ queryKey: ["premium"], queryFn: () => listPremium() });

export const Route = createFileRoute("/_gated/premium")({
  head: () => ({
    meta: [
      { title: "Premium domains — Vault Portal" },
      { name: "description", content: "Private list of premium domains, cPanel access and active status." },
      { property: "og:title", content: "Premium domains — Vault Portal" },
      { property: "og:description", content: "Private list of premium domains, cPanel access and active status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
});

type PremiumDomain = Awaited<ReturnType<typeof listPremium>>[number];

function cleanUrl(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

function headerBackground(index: number) {
  return index % 2 === 0
    ? "linear-gradient(145deg, oklch(0.19 0.04 260), oklch(0.165 0.05 260))"
    : "linear-gradient(145deg, oklch(0.27 0.04 260), oklch(0.235 0.05 260))";
}

function CpanelCell({ domain, zebra }: { domain: PremiumDomain; zebra: string }) {
  const updateFn = useServerFn(updatePremiumDomain);
  const revealFn = useServerFn(revealPremiumDomainCpanelPassword);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [loginUrl, setLoginUrl] = useState(
    domain.cpanel_login_url || `https://${cleanUrl(domain.url)}:2083`,
  );
  const [username, setUsername] = useState(domain.cpanel_username || "");
  const [password, setPassword] = useState("");
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const accessState = domain.active ? domain.cpanel_access_state : "not_applicable";

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["premium"] });
    await qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const saveAccessState = async (value: string) => {
    await updateFn({ data: { id: domain.id, field: "cpanel_access_state", value } });
    await invalidate();
  };
  const saveLogin = async () => {
    await updateFn({ data: { id: domain.id, field: "cpanel_login_url", value: loginUrl } });
    await updateFn({ data: { id: domain.id, field: "cpanel_username", value: username } });
    if (password) {
      await updateFn({ data: { id: domain.id, field: "cpanel_password", value: password } });
    }
    await updateFn({ data: { id: domain.id, field: "cpanel_access_state", value: "available" } });
    setPassword("");
    setEditing(false);
    await invalidate();
  };
  const reveal = async () => {
    const result = await revealFn({ data: { id: domain.id } });
    setRevealedPassword(result.password);
  };
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (!domain.active) {
    return (
      <td className={`border-b border-r border-border px-3 py-3 text-center ${zebra}`}>
        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground">N/A</span>
      </td>
    );
  }

  return (
    <td className={`border-b border-r border-border px-2 py-2 text-center ${zebra}`}>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {accessState === "available" && (
          <Popover onOpenChange={(open) => {
            if (!open) {
              setEditing(false);
              setRevealedPassword(null);
            }
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-info underline decoration-dotted underline-offset-4 hover:decoration-solid"
              >
                <Eye className="h-3.5 w-3.5" />
                Reveal
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-80 space-y-3 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold uppercase tracking-wide">cPanel login</div>
                <button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-1 text-info">
                  <Pencil className="h-3 w-3" />
                  {editing ? "Cancel" : "Edit"}
                </button>
              </div>
              {editing ? (
                <>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Login URL</span>
                    <input value={loginUrl} onChange={(event) => setLoginUrl(event.target.value)} className="w-full rounded-md border border-border bg-muted px-2 py-1.5 font-mono" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Username</span>
                    <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-md border border-border bg-muted px-2 py-1.5 font-mono" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New password</span>
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep current" className="w-full rounded-md border border-border bg-muted px-2 py-1.5 font-mono" />
                  </label>
                  <div className="flex justify-end">
                    <button type="button" onClick={saveLogin} className="rounded-md bg-primary px-3 py-1.5 font-bold text-primary-foreground">Save</button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Login URL</div>
                    <a href={domain.cpanel_login_url || loginUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-info hover:underline">
                      Open cPanel <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Username</div>
                    <code className="block rounded-md bg-muted px-2 py-1.5">{domain.cpanel_username || "Not given"}</code>
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</div>
                    {revealedPassword ? (
                      <div className="flex items-center gap-1">
                        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5">{revealedPassword}</code>
                        <button type="button" onClick={() => copy(revealedPassword)} className="rounded p-1.5 hover:bg-muted" aria-label="Copy password">
                          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={reveal} className="font-semibold text-info hover:underline">
                        {domain.has_cpanel_password ? "Reveal password" : "Show status"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>
        )}
        {accessState === "not_given" && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-info underline decoration-dotted underline-offset-4">
                <Pencil className="h-3.5 w-3.5" />
                Add login
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-80 space-y-2 p-3 text-xs">
              <div className="font-bold uppercase tracking-wide">Add cPanel login</div>
              <input value={loginUrl} onChange={(event) => setLoginUrl(event.target.value)} placeholder="Login URL" className="w-full rounded-md border border-border bg-muted px-2 py-1.5 font-mono" />
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" className="w-full rounded-md border border-border bg-muted px-2 py-1.5 font-mono" />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-md border border-border bg-muted px-2 py-1.5 font-mono" />
              <div className="flex justify-end">
                <button type="button" onClick={saveLogin} className="rounded-md bg-primary px-3 py-1.5 font-bold text-primary-foreground">Save</button>
              </div>
            </PopoverContent>
          </Popover>
        )}
        <select
          value={accessState}
          onChange={(event) => saveAccessState(event.target.value)}
          className="max-w-[105px] rounded-md border border-border bg-background px-1.5 py-1 text-[11px] font-bold"
          aria-label={`cPanel login state for ${domain.name}`}
        >
          <option value="available">Available</option>
          <option value="not_given">Not given</option>
        </select>
      </div>
    </td>
  );
}

function ActiveCell({ domain, zebra }: { domain: PremiumDomain; zebra: string }) {
  const updateFn = useServerFn(updatePremiumDomain);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (active: boolean) => updateFn({ data: { id: domain.id, field: "active", value: active } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["premium"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <td className={`border-b border-r border-border p-0 text-center ${zebra}`}>
      <select
        value={domain.active ? "active" : "inactive"}
        onChange={(event) => mutation.mutate(event.target.value === "active")}
        className={`h-full min-h-10 w-full border-0 px-3 py-2 text-center text-[12px] font-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring ${
          domain.active ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-red-500/12 text-red-700 dark:text-red-300"
        }`}
        aria-label={`Active status for ${domain.name}`}
      >
        <option value="active">Active</option>
        <option value="inactive">Not active</option>
      </select>
    </td>
  );
}

function Page() {
  const { data } = useSuspenseQuery(opts);
  const [hoveredColumn, setHoveredColumn] = useState(-1);
  const activeCount = data.filter((domain) => domain.active).length;
  return (
    <AppShell title="Premium domains">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{activeCount} active domains</div>
          <div className="text-xs text-muted-foreground">{data.length} premium domains in total</div>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No premium domains yet.</div>
      ) : (
        <div
          id="premium-domains-grid"
          data-column-hover={hoveredColumn > 1 ? "active" : "inactive"}
          onMouseOver={(event) => {
            const cell = (event.target as HTMLElement).closest("th, td") as HTMLTableCellElement | null;
            setHoveredColumn(cell && cell.cellIndex > 0 ? cell.cellIndex + 1 : -1);
          }}
          onMouseLeave={() => setHoveredColumn(-1)}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          {hoveredColumn > 1 && (
            <style>{`
              @media (min-width: 1024px) {
                #premium-domains-grid[data-column-hover="active"] tr > * {
                  transform-origin: center top;
                  transition: transform 180ms ease, box-shadow 180ms ease;
                }
                #premium-domains-grid[data-column-hover="active"] tr > *:nth-child(${hoveredColumn}) {
                  position: relative;
                  z-index: 15;
                  transform: scale(1.012);
                  box-shadow: 0 7px 18px rgb(2 7 19 / .09);
                }
                #premium-domains-grid[data-column-hover="active"] thead tr > *:nth-child(${hoveredColumn}) {
                  z-index: 40;
                  transform: scale(1.045);
                  box-shadow: 0 12px 26px rgb(2 7 19 / .16);
                }
              }
            `}</style>
          )}
          <div className="max-h-[calc(100vh-8rem)] overflow-auto">
            <table className="w-max border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 min-w-[210px] border-b border-r border-border bg-sidebar px-3 py-3 text-left text-[13px] font-bold text-sidebar-foreground">
                    Field
                  </th>
                  {data.map((domain, index) => (
                    <th
                      key={domain.id}
                      style={{ background: headerBackground(index) }}
                      className="relative min-w-[190px] w-[190px] border-b border-r border-border px-3 py-3 text-sidebar-foreground"
                    >
                      <div className="flex flex-col items-center gap-1 text-center">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${domain.active ? "bg-emerald-400" : "bg-red-400"}`} />
                          <span className="block max-w-[160px] truncate text-[14px] font-bold">{domain.name}</span>
                        </div>
                        <a href={domain.url.startsWith("http") ? domain.url : `https://${domain.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[170px] items-center gap-1 truncate text-[10.5px] text-info hover:underline">
                          {cleanUrl(domain.url)}
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </a>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="group">
                  <th className="sticky left-0 z-10 border-b border-r border-border bg-muted px-3 py-3 text-left font-semibold">cPanel login</th>
                  {data.map((domain, index) => (
                    <CpanelCell key={domain.id} domain={domain} zebra={index % 2 ? "bg-muted/20" : "bg-transparent"} />
                  ))}
                </tr>
                <tr className="group">
                  <th className="sticky left-0 z-10 border-b border-r border-border bg-muted px-3 py-3 text-left font-semibold">Active or not active</th>
                  {data.map((domain, index) => (
                    <ActiveCell key={domain.id} domain={domain} zebra={index % 2 ? "bg-muted/20" : "bg-transparent"} />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
