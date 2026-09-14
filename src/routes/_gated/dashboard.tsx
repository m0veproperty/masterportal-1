import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/portal/AppShell";
import { categoryLabel } from "@/components/portal/Badges";
import { MultiCheckFilter } from "@/components/portal/MultiCheckFilter";
import { getDashboard } from "@/lib/portal.functions";
import { Globe, Activity, X, Blocks, ArrowUpDown, ExternalLink, Search, Copy, Check, Star } from "lucide-react";

const dashOpts = queryOptions({ queryKey: ["dashboard"], queryFn: () => getDashboard() });

export const Route = createFileRoute("/_gated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vault Portal" },
      { name: "description", content: "Private overview of website portfolio counts and recent updates." },
      { property: "og:title", content: "Dashboard — Vault Portal" },
      { property: "og:description", content: "Private overview of website portfolio counts and recent updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashOpts),
  component: DashboardPage,
});

type DashboardSite = {
  id: string;
  name: string;
  url: string;
  category: string | null;
  server_label: string | null;
  importance_score: number;
};
type CategoryBucket = { count: number; sites: DashboardSite[] };

function StatCard({
  label,
  value,
  Icon,
  onList,
}: {
  label: string;
  value: number | string;
  Icon: React.ComponentType<{ className?: string }>;
  onList?: () => void;
}) {
  return (
    <div className="spotlight-item spotlight-focus bg-card border border-border rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">{label}</div>
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      {onList && (
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={onList}
            className="text-[11px] text-info hover:underline"
          >
            List
          </button>
        </div>
      )}
    </div>
  );
}

function ListDialog({
  title,
  sites,
  showType,
  onClose,
}: {
  title: string;
  sites: DashboardSite[];
  showType: boolean;
  onClose: () => void;
}) {
  type SortKey = "name" | "url" | "server" | "category" | "priority";
  const servers = useMemo(
    () => Array.from(new Set(sites.map((site) => site.server_label ?? "Unassigned"))).sort(),
    [sites],
  );
  const priorityOptions = [
    { value: "very_high", label: "Very high (9-10)" },
    { value: "high", label: "High (7-8)" },
    { value: "mid", label: "Mid (4-6)" },
    { value: "low", label: "Low (1-3)" },
  ];
  const [selectedServers, setSelectedServers] = useState<string[]>(servers);
  const [selectedPriorities, setSelectedPriorities] = useState(priorityOptions.map((option) => option.value));
  const [search, setSearch] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "priority",
    direction: "desc",
  });
  const filteredSites = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sites
      .filter((site) => selectedServers.includes(site.server_label ?? "Unassigned"))
      .filter((site) => {
        const score = site.importance_score;
        const band = score >= 9 ? "very_high" : score >= 7 ? "high" : score >= 4 ? "mid" : "low";
        return selectedPriorities.includes(band);
      })
      .filter((site) =>
        !needle
        || site.name.toLowerCase().includes(needle)
        || site.url.toLowerCase().includes(needle)
        || (site.server_label ?? "").toLowerCase().includes(needle)
      )
      .sort((a, b) => {
        const values: Record<SortKey, [string | number, string | number]> = {
          name: [a.name, b.name],
          url: [cleanUrlSimple(a.url), cleanUrlSimple(b.url)],
          server: [a.server_label ?? "", b.server_label ?? ""],
          category: [categoryLabel(a.category ?? "other"), categoryLabel(b.category ?? "other")],
          priority: [a.importance_score, b.importance_score],
        };
        const [left, right] = values[sort.key];
        const comparison = typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
        return (sort.direction === "asc" ? comparison : -comparison)
          || a.name.localeCompare(b.name);
      });
  }, [search, selectedPriorities, selectedServers, sites, sort]);
  const changeSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };
  const copyAll = async () => {
    const headers = ["Website", "URL", "Server", ...(showType ? ["Type"] : []), "Priority"];
    const rows = filteredSites.map((site) => [
      site.name,
      site.url,
      site.server_label ?? "Unassigned",
      ...(showType ? [categoryLabel(site.category ?? "other")] : []),
      String(site.importance_score),
    ]);
    await navigator.clipboard.writeText(
      [headers, ...rows]
        .map((row) => row.map((cell) => cell.replaceAll("\t", " ").replaceAll("\n", " ")).join("\t"))
        .join("\n"),
    );
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1600);
  };
  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <button type="button" onClick={() => changeSort(sortKey)} className="inline-flex items-center gap-1.5 font-black hover:text-info">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sort.key === sortKey ? "text-info" : "opacity-35"}`} />
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-[61rem] max-h-[88vh] flex flex-col overflow-hidden p-3 md:p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3 px-1 py-1">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Showing {filteredSites.length} of {sites.length}, sorted by priority</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyAll}
              disabled={filteredSites.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[11px] font-bold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              {copiedAll ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedAll ? "Copied" : "Copy all"}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/25 px-4 py-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, URL or server…"
                className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <MultiCheckFilter
              label="Servers"
              allLabel="All servers"
              options={servers.map((server) => ({ value: server, label: server }))}
              selected={selectedServers}
              onChange={setSelectedServers}
              minWidth={160}
            />
            <MultiCheckFilter
              label="Priorities"
              allLabel="All priorities"
              options={priorityOptions}
              selected={selectedPriorities}
              onChange={setSelectedPriorities}
              minWidth={160}
            />
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-10 bg-sidebar text-sidebar-foreground">
              <tr>
                <th className="border-b border-r border-sidebar-border px-4 py-3 text-left"><SortHeader label="Website" sortKey="name" /></th>
                <th className="border-b border-r border-sidebar-border px-4 py-3 text-left"><SortHeader label="URL" sortKey="url" /></th>
                <th className="border-b border-r border-sidebar-border px-4 py-3 text-left"><SortHeader label="Server" sortKey="server" /></th>
                {showType && (
                  <th className="border-b border-r border-sidebar-border px-4 py-3 text-left"><SortHeader label="Type" sortKey="category" /></th>
                )}
                <th className="border-b border-sidebar-border px-4 py-3 text-center"><SortHeader label="Priority" sortKey="priority" /></th>
              </tr>
            </thead>
            <tbody className="spotlight-group">
              {filteredSites.map((site) => (
                <tr key={site.id} className="spotlight-item bg-card even:bg-muted/20">
                  <td className="border-b border-r border-border px-4 py-3 font-bold">
                    <Link to="/websites/$id" params={{ id: site.id }} className="hover:text-info hover:underline">
                      {site.name}
                    </Link>
                  </td>
                  <td className="border-b border-r border-border px-4 py-3">
                    <a
                      href={site.url.startsWith("http") ? site.url : `https://${site.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-info hover:underline"
                    >
                      {cleanUrlSimple(site.url)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="border-b border-r border-border px-4 py-3 font-semibold">{site.server_label ?? "Unassigned"}</td>
                  {showType && (
                    <td className="border-b border-r border-border px-4 py-3 font-semibold">{categoryLabel(site.category ?? "other")}</td>
                  )}
                  <td className="border-b border-border px-4 py-3 text-center">
                    <span className={`inline-grid h-7 min-w-7 place-items-center rounded-full px-2 font-black ${
                      site.importance_score >= 9
                        ? "bg-red-100 text-red-700"
                        : site.importance_score >= 7
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                    }`}>
                      {site.importance_score}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredSites.length === 0 && (
                <tr>
                  <td colSpan={showType ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground">
                    No websites match these filters.
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function cleanUrlSimple(u: string) {
  return u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

function DashboardPage() {
  const { data } = useSuspenseQuery(dashOpts);
  const [openList, setOpenList] = useState<null | { title: string; sites: CategoryBucket["sites"]; showType: boolean }>(null);

  const categoryOrder = ["affiliate", "adsense_other", "dropship", "pbn", "portfolio", "client", "other"];
  const categories = categoryOrder
    .filter((k) => data.byCategory[k])
    .map((k) => ({ key: k, label: categoryLabel(k), ...data.byCategory[k] }));

  const allSites = Object.values(data.byCategory).flatMap((b) => b.sites)
    .sort((a, b) => b.importance_score - a.importance_score || a.name.localeCompare(b.name));

  return (
    <AppShell title="Dashboard">
      <div className="spotlight-group mb-6 grid gap-4 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => setOpenList({ title: "WordPress websites", sites: data.wordpress.sites, showType: true })}
          className="spotlight-item spotlight-focus group flex w-full items-center justify-between overflow-hidden rounded-2xl border border-violet-300/20 bg-gradient-to-r from-[#111a35] via-[#17234b] to-[#172f52] px-5 py-5 text-left text-white shadow-[0_18px_45px_rgba(20,30,70,.18)] transition-transform"
        >
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200">
              <Blocks className="h-4 w-4" />
              WordPress estate
            </div>
            <div className="text-sm text-white/65">Websites currently recorded as using WordPress</div>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[11px] font-semibold text-cyan-200 opacity-0 transition-opacity group-hover:opacity-100">View list</span>
            <span className="text-4xl font-semibold tracking-tight">{data.wordpress.count}</span>
          </div>
        </button>
        <Link
          to="/premium"
          className="spotlight-item spotlight-focus group flex w-full items-center justify-between overflow-hidden rounded-2xl border border-fuchsia-300/20 bg-gradient-to-r from-[#17142f] via-[#24204b] to-[#342454] px-5 py-5 text-left text-white shadow-[0_18px_45px_rgba(42,24,80,.18)] transition-transform"
        >
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-fuchsia-200">
              <Star className="h-4 w-4" />
              Premium domain estate
            </div>
            <div className="text-sm text-white/65">Active premium domains held in the portfolio</div>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[11px] font-semibold text-fuchsia-200 opacity-0 transition-opacity group-hover:opacity-100">View list</span>
            <span className="text-4xl font-semibold tracking-tight">{data.premiumDomains.count}</span>
          </div>
        </Link>
      </div>

      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        Websites by type
      </div>
      <div className="spotlight-group grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total websites"
          value={data.total}
          Icon={Globe}
          onList={() => setOpenList({ title: "All websites", sites: allSites, showType: true })}
        />
        {categories.map((c) => (
          <StatCard
            key={c.key}
            label={`Total ${c.label.toLowerCase()}`}
            value={c.count}
            Icon={Globe}
            onList={() => setOpenList({ title: c.label, sites: c.sites, showType: false })}
          />
        ))}
      </div>

      <section className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Recent updates & activity
        </h2>
        <ul className="spotlight-group space-y-2">
          {data.feed.length === 0 && (
            <li className="text-sm text-muted-foreground">Nothing recorded yet.</li>
          )}
          {data.feed.map((e) => {
            const row = (
              <div className="flex items-start justify-between gap-3 py-2 px-2 rounded hover:bg-accent">
                <div className="min-w-0">
                  <div className="text-sm text-foreground">
                    {e.website_name && <span className="font-medium">{e.website_name} · </span>}
                    {e.summary}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(e.when).toLocaleString()} · {e.kind === "update" ? "Record update" : "Activity"}
                  </div>
                </div>
              </div>
            );
            return (
              <li key={e.id} className="spotlight-item border-b border-border/50 last:border-0">
                {e.website_id ? (
                  <Link to="/websites/$id" params={{ id: e.website_id }}>{row}</Link>
                ) : row}
              </li>
            );
          })}
        </ul>
      </section>

      {openList && (
        <ListDialog title={openList.title} sites={openList.sites} showType={openList.showType} onClose={() => setOpenList(null)} />
      )}
    </AppShell>
  );
}
