import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/portal/AppShell";
import { Band, HealthBadge, ImportanceBadge, categoryLabel } from "@/components/portal/Badges";
import { CredentialField } from "@/components/portal/CredentialField";
import { getWebsite, markChecked } from "@/lib/portal.functions";
import {
  ArrowLeft, ExternalLink, CheckCircle2, Globe, ShieldCheck, Search, Share2,
  Wrench, Activity as ActivityIcon, StickyNote, KeyRound, TrendingDown, Sparkles,
} from "lucide-react";

const opts = (id: string) =>
  queryOptions({ queryKey: ["website", id], queryFn: () => getWebsite({ data: { id } }) });

export const Route = createFileRoute("/_gated/websites/$id")({
  head: () => ({
    meta: [
      { title: "Website — Vault Portal" },
      { name: "description", content: "Full website record with credentials, WordPress, SEO, PPC alerts, social and maintenance state." },
      { property: "og:title", content: "Website — Vault Portal" },
      { property: "og:description", content: "Full website record with credentials, WordPress, SEO, PPC alerts, social and maintenance state." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(opts(params.id)),
  component: WebsiteDetail,
});

type TabKey =
  | "Overview" | "Credentials" | "WordPress" | "Security"
  | "SEO" | "Schema" | "Social" | "PPC & alerts" | "Maintenance" | "Notes" | "Activity";

const ICONS: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  Overview: Globe,
  Credentials: KeyRound,
  WordPress: Wrench,
  Security: ShieldCheck,
  SEO: Search,
  Schema: Sparkles,
  Social: Share2,
  "PPC & alerts": TrendingDown,
  Maintenance: CheckCircle2,
  Notes: StickyNote,
  Activity: ActivityIcon,
};

function WebsiteDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(opts(id));
  const { website: w, credentials, activity, health } = data;
  const extra = (w.extra_fields ?? {}) as Record<string, string>;
  const ppcOn = w.ppc_enabled && /^yes/i.test(w.ppc_enabled);

  const allTabs: TabKey[] = [
    "Overview", "Credentials", "WordPress", "Security",
    "SEO", "Schema", "Social",
    ...(ppcOn ? ["PPC & alerts" as TabKey] : []),
    "Maintenance", "Notes", "Activity",
  ];
  const [tab, setTab] = useState<TabKey>("Overview");

  const qc = useQueryClient();
  const check = useServerFn(markChecked);
  const doCheck = async (kind: "theme_plugins" | "obsolete_plugins" | "search_console") => {
    await check({ data: { website_id: id, kind } });
    qc.invalidateQueries({ queryKey: ["website", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <AppShell
      title={w.name}
      actions={
        <a
          href={w.url.startsWith("http") ? w.url : `https://${w.url}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent"
        >
          Open site <ExternalLink className="w-3.5 h-3.5" />
        </a>
      }
    >
      <Link to="/websites" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> All websites
      </Link>

      {/* Modern gradient hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border mb-6">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(1200px 400px at 0% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%), radial-gradient(900px 400px at 100% 0%, color-mix(in oklab, var(--info) 18%, transparent), transparent 60%), linear-gradient(180deg, var(--card), var(--card))",
          }}
        />
        <div className="relative p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {categoryLabel(w.category)}
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">{w.name}</h2>
              <a
                href={w.url.startsWith("http") ? w.url : `https://${w.url}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                {w.url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "")} <ExternalLink className="w-3 h-3" />
              </a>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <HealthBadge status={health.status} />
                <ImportanceBadge level={w.importance} />
                {ppcOn && <Band tone="red">PPC enabled</Band>}
                {w.status && <Band tone="grey">Status: {w.status}</Band>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 min-w-[280px]">
              <MiniStat label="Issues" value={String(health.issues.length)} tone={health.issues.length ? "red" : "green"} />
              <MiniStat label="Credentials" value={String(credentials.length)} tone="blue" />
              <MiniStat
                label="PHP"
                value={w.php_version || "—"}
                tone={w.php_version && /^([0-6]|7)\./.test(w.php_version) ? "red" : "grey"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pill tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {allTabs.map((t) => {
          const Icon = ICONS[t];
          const isPpc = t === "PPC & alerts";
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent",
                isPpc && !active ? "band-red border-transparent" : "",
              ].join(" ")}
            >
              <Icon className="w-3.5 h-3.5" />
              {t}
            </button>
          );
        })}
      </div>

      {tab === "Overview" && <Overview w={w} extra={extra} health={health} />}
      {tab === "Credentials" && <Credentials creds={credentials} websiteId={id} />}
      {tab === "WordPress" && <WordPressTab w={w} extra={extra} />}
      {tab === "Security" && <SecurityTab w={w} extra={extra} />}
      {tab === "SEO" && <SEOTab w={w} extra={extra} />}
      {tab === "Schema" && <SchemaTab extra={extra} />}
      {tab === "Social" && <SocialTab creds={credentials} extra={extra} websiteId={id} />}
      {tab === "PPC & alerts" && <PPCTab w={w} extra={extra} />}
      {tab === "Maintenance" && <MaintenanceTab w={w} onCheck={doCheck} />}
      {tab === "Notes" && <NotesTab w={w} />}
      {tab === "Activity" && <ActivityTab activity={activity} />}
    </AppShell>
  );
}

/* ---------- Helpers ---------- */

const toneMap: Record<string, string> = {
  green: "band-green", red: "band-red", amber: "band-amber",
  orange: "band-orange", blue: "band-blue", grey: "band-grey",
};

function MiniStat({ label, value, tone }: { label: string; value: string; tone: keyof typeof toneMap }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 inline-flex px-2 py-0.5 rounded-md text-sm font-semibold ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}

function valueTone(v: string | null | undefined): keyof typeof toneMap {
  if (!v) return "grey";
  const s = v.toLowerCase();
  if (/^yes/.test(s) || /^done/.test(s) || /installed/.test(s) || /active/.test(s)) return "green";
  if (/^no\b/.test(s) || /fail/.test(s) || /missing/.test(s) || /overdue/.test(s)) return "red";
  if (/unsure|partial|some|check/.test(s)) return "amber";
  return "blue";
}

function ValueChip({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-xs italic text-muted-foreground">Not recorded</span>;
  const tone = valueTone(value);
  return <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${toneMap[tone]}`}>{value}</span>;
}

function Row({ label, value, note }: { label: string; value: React.ReactNode; note?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/40 last:border-0">
      <div className="text-sm text-muted-foreground flex-1 min-w-0">{label}</div>
      <div className="text-sm text-right max-w-[55%] break-words">
        {value}
        {note && <div className="text-[11px] text-muted-foreground mt-1">{note}</div>}
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, tone }: { title: string; subtitle?: string; children: React.ReactNode; tone?: string }) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <header className={`px-5 py-3 border-b border-border/60 flex items-center justify-between ${tone ?? ""}`}>
        <div>
          <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="px-5 py-3">{children}</div>
    </section>
  );
}

/** Pick extra_fields entries by list of lowercase keys (case-insensitive). */
function pick(extra: Record<string, string>, keys: string[]) {
  const map = new Map(Object.entries(extra).map(([k, v]) => [k.toLowerCase(), v]));
  return keys
    .map((k) => ({ key: k, label: prettyLabel(k), value: map.get(k.toLowerCase()) ?? null }))
    .filter((e) => e.value !== undefined);
}

function prettyLabel(k: string) {
  return k
    .replace(/\?$/, "")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------- Overview ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Website = any;

function Overview({ w, extra, health }: { w: Website; extra: Record<string, string>; health: { issues: string[] } }) {
  const structural = pick(extra, ["Any Sub-Domains / Directories?", "Other Wordpress Admin Users?", "Other Assets", "Other Emails", "Email Used on Contact Form"]);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card title="General">
        <Row label="Hosting" value={<ValueChip value={w.hosting_provider} />} />
        <Row label="Server" value={<ValueChip value={w.server_label} />} />
        <Row label="Website type" value={<ValueChip value={w.website_type} />} />
        <Row label="Associated email" value={w.associated_email ? <span className="font-mono text-xs">{w.associated_email}</span> : <ValueChip value={null} />} />
        <Row label="Address" value={w.address ?? <ValueChip value={null} />} />
        <Row label="Last reviewed" value={w.last_reviewed_date ?? <ValueChip value={null} />} />
        <Row label="Next review" value={w.next_review_date ?? <ValueChip value={null} />} />
      </Card>

      <Card title="Health issues" tone={health.issues.length ? "band-red" : ""}>
        {health.issues.length === 0 ? (
          <div className="text-sm text-success py-2">No open issues.</div>
        ) : (
          <ul className="text-sm space-y-1.5">
            {health.issues.map((i, k) => (
              <li key={k} className="flex gap-2"><span className="text-danger">•</span>{i}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Structural">
        {structural.length === 0 && <div className="text-xs text-muted-foreground">Nothing recorded.</div>}
        {structural.map((e) => <Row key={e.key} label={e.label} value={<ValueChip value={e.value} />} />)}
      </Card>
    </div>
  );
}

/* ---------- Credentials ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Credentials({ creds, websiteId }: { creds: any[]; websiteId: string }) {
  const nonSocial = creds.filter((c) => !["facebook", "twitter", "pinterest", "instagram"].includes((c.kind ?? "") as string));
  if (nonSocial.length === 0) return <div className="text-sm text-muted-foreground">No credentials stored.</div>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {nonSocial.map((c) => {
        const kind = String(c.kind ?? "");
        return (
          <Card key={String(c.id)} title={`${kind[0]?.toUpperCase()}${kind.slice(1)}${c.label ? ` — ${c.label}` : ""}`}>
            {c.login_url && (
              <Row label="Login URL" value={
                <a href={c.login_url} target="_blank" rel="noopener noreferrer" className="text-info hover:underline break-all">{c.login_url}</a>
              } />
            )}
            {c.username && <Row label="Username" value={<span className="font-mono text-xs">{c.username}</span>} />}
            <Row label="Password" value={<CredentialField credentialId={String(c.id)} websiteId={websiteId} label={`${kind} password`} />} />
            {c.phone && <Row label="Phone" value={c.phone} />}
            {c.recovery_email && <Row label="Recovery" value={<span className="font-mono text-xs">{c.recovery_email}</span>} />}
            {c.two_factor && <Row label="2FA" value={<ValueChip value={c.two_factor} />} />}
            {c.notes && <Row label="Notes" value={c.notes} />}
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- WordPress ---------- */
function WordPressTab({ w, extra }: { w: Website; extra: Record<string, string> }) {
  const wpExtras = pick(extra, ["Latest Theme", "Email Server Unblocked IP", "Wordpress Email as security@wiwy.com", "Perfmatters", "Can Scripts Be Loaded? (Uber Mobile Menu Truncation)"]);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="WordPress core">
        <Row label="Login URL" value={w.wordpress_login_url ? <a href={w.wordpress_login_url} target="_blank" rel="noopener noreferrer" className="text-info hover:underline break-all">{w.wordpress_login_url}</a> : <ValueChip value={null} />} />
        <Row label="Admin email" value={w.wordpress_admin_email ? <span className="font-mono text-xs">{w.wordpress_admin_email}</span> : <ValueChip value={null} />} />
        <Row label="WordPress version" value={<ValueChip value={w.wordpress_version} />} />
        <Row label="Auto-updates" value={<ValueChip value={w.wordpress_auto_updates} />} />
        <Row label="XML-RPC disabled" value={<ValueChip value={w.xml_rpc_disabled} />} />
        <Row label="PHP version" value={<ValueChip value={w.php_version} />} />
      </Card>
      <Card title="Environment & tooling">
        {wpExtras.length === 0 && <div className="text-xs text-muted-foreground">Nothing recorded.</div>}
        {wpExtras.map((e) => <Row key={e.key} label={e.label} value={<ValueChip value={e.value} />} />)}
      </Card>
    </div>
  );
}

/* ---------- Security ---------- */
function SecurityTab({ w, extra }: { w: Website; extra: Record<string, string> }) {
  const items: Array<[string, string | null, string | null]> = [
    ["Security plugin installed", w.security_plugin, w.security_plugin_other],
    ["Firewall active", w.firewall, w.firewall_other],
    ["CAPTCHA on public forms", w.captcha_protection, w.captcha_protection_other],
    ["Comments & pings disabled", w.comments_pings, w.comments_pings_other],
    ["GDPR banner", w.gdpr_banner, w.gdpr_banner_other],
    ["External link noopener/noreferrer", w.external_link_security, w.external_link_security_other],
  ];
  const monitoring = pick(extra, ["Uptime Robot?", "Plugin Folder Renamed?", "Spam Email Captcha (Honeypot + Google ReCaptcha)"]);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Hardening" tone="band-blue">
        {items.map(([l, v, o]) => (
          <Row key={l} label={l} value={<ValueChip value={v} />} note={o ?? undefined} />
        ))}
      </Card>
      <Card title="Monitoring & spam">
        {monitoring.length === 0 && <div className="text-xs text-muted-foreground">Nothing recorded.</div>}
        {monitoring.map((e) => <Row key={e.key} label={e.label} value={<ValueChip value={e.value} />} />)}
        <Row label="Image compression" value={<ValueChip value={w.image_compression} />} note={w.image_compression_other ?? undefined} />
        <Row label="Caching plugin" value={<ValueChip value={w.caching_plugin} />} note={w.caching_plugin_other ?? undefined} />
      </Card>
    </div>
  );
}

/* ---------- SEO ---------- */
function SEOTab({ w, extra }: { w: Website; extra: Record<string, string> }) {
  const seoExtras = pick(extra, [
    "Rank Math",
    "Search Console + Target Region",
    "Last Disavow",
    "Original Featured Images",
    "Amazon Mobile Product Image",
    "Analytics Conversion Tracking",
    "Footer Recommended Articles + Image Size",
    "Span Text Free Content",
    "Cache Copy Check / Content Egg Style",
  ]);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Core SEO">
        <Row label="SEO plugin" value={<ValueChip value={w.seo_plugin} />} note={w.seo_plugin_other ?? undefined} />
        <Row label="Publish dates removed from SERPs" value={<ValueChip value={w.publish_dates_removed} />} note={w.publish_dates_removed_other ?? undefined} />
        <Row label="Search Console status" value={<ValueChip value={w.search_console_status} />} />
        <Row label="Search Console last reviewed" value={w.search_console_checked_at ?? <ValueChip value={null} />} />
      </Card>
      <Card title="Link handling" tone="band-blue">
        <Row label="Misc links (author, tags) rel=nofollow" value={<ValueChip value={w.misc_links_nofollow} />} note={w.misc_links_nofollow_other ?? undefined} />
        <Row label="Social links rel=nofollow" value={<ValueChip value={w.social_links_nofollow} />} note={w.social_links_nofollow_other ?? undefined} />
        {w.category === "affiliate" && (
          <Row label="Amazon links rel=nofollow" value={<ValueChip value={w.amazon_links_nofollow} />} note={w.amazon_links_nofollow_other ?? undefined} />
        )}
      </Card>
      <Card title="SEO tooling & content">
        {seoExtras.length === 0 && <div className="text-xs text-muted-foreground">Nothing recorded.</div>}
        {seoExtras.map((e) => <Row key={e.key} label={e.label} value={<ValueChip value={e.value} />} />)}
      </Card>
    </div>
  );
}

/* ---------- Schema ---------- */
function SchemaTab({ extra }: { extra: Record<string, string> }) {
  const items = pick(extra, [
    "Article or FAQ Schema",
    "Rating Schema",
    "Social Channels Schema",
  ]);
  if (items.length === 0) return <div className="text-sm text-muted-foreground">No schema fields recorded.</div>;
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {items.map((e) => (
        <Card key={e.key} title={e.label}>
          <div className="py-2"><ValueChip value={e.value} /></div>
        </Card>
      ))}
    </div>
  );
}

/* ---------- Social ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SocialTab({ creds, extra, websiteId }: { creds: any[]; extra: Record<string, string>; websiteId: string }) {
  const social = creds.filter((c) => ["facebook", "twitter", "pinterest", "instagram"].includes((c.kind ?? "") as string));
  const rawSocial = pick(extra, ["Facebook", "Twitter + Tel", "Pinterest + Tel", "Instagram + Tel", "Tumblr + Tel"]);
  return (
    <div className="space-y-4">
      {social.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {social.map((c) => {
            const kind = String(c.kind ?? "");
            return (
              <Card key={String(c.id)} title={kind[0]?.toUpperCase() + kind.slice(1)}>
                {c.login_url && <Row label="Profile" value={<a href={c.login_url} target="_blank" rel="noopener noreferrer" className="text-info hover:underline break-all">{c.login_url}</a>} />}
                {c.username && <Row label="Username" value={<span className="font-mono text-xs">{c.username}</span>} />}
                <Row label="Password" value={<CredentialField credentialId={String(c.id)} websiteId={websiteId} label={`${kind} password`} />} />
                {c.phone && <Row label="Phone" value={c.phone} />}
                {c.recovery_email && <Row label="Recovery" value={<span className="font-mono text-xs">{c.recovery_email}</span>} />}
              </Card>
            );
          })}
        </div>
      )}
      {rawSocial.length > 0 && (
        <Card title="Raw social entries" subtitle="From the source spreadsheet">
          {rawSocial.map((e) => <Row key={e.key} label={e.label} value={<span className="text-xs whitespace-pre-wrap">{e.value}</span>} />)}
        </Card>
      )}
      {social.length === 0 && rawSocial.length === 0 && (
        <div className="text-sm text-muted-foreground">No social entries recorded.</div>
      )}
    </div>
  );
}

/* ---------- PPC & Alerts ---------- */
function PPCTab({ w, extra }: { w: Website; extra: Record<string, string> }) {
  const alertPairs = useMemo(() => {
    const items = Object.entries(extra).filter(([k]) => /drop|increase|paid|organic/i.test(k));
    const organic = items.filter(([k]) => /organic/i.test(k) || /drop/i.test(k) && !/paid/i.test(k));
    const paid = items.filter(([k]) => /paid/i.test(k));
    return { organic, paid };
  }, [extra]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-danger/40 band-red px-5 py-4">
        <div className="text-sm font-semibold">PPC is enabled for this site</div>
        <div className="text-xs opacity-80 mt-0.5">Traffic & cost anomaly thresholds are being tracked.</div>
        <div className="mt-3">
          <Row label="PPC enabled" value={<ValueChip value={w.ppc_enabled} />} />
        </div>
      </div>
      <Card title="Organic traffic alerts" subtitle="Thresholds imported from source">
        {alertPairs.organic.length === 0 && <div className="text-xs text-muted-foreground">No organic thresholds recorded.</div>}
        {alertPairs.organic.map(([k, v]) => <Row key={k} label={prettyLabel(k)} value={<ValueChip value={v} />} />)}
      </Card>
      <Card title="Paid traffic & cost alerts" tone="band-amber">
        {alertPairs.paid.length === 0 && <div className="text-xs text-muted-foreground">No paid thresholds recorded.</div>}
        {alertPairs.paid.map(([k, v]) => <Row key={k} label={prettyLabel(k)} value={<ValueChip value={v} />} />)}
      </Card>
    </div>
  );
}

/* ---------- Maintenance ---------- */
function MaintenanceTab({ w, onCheck }: { w: Website; onCheck: (k: "theme_plugins" | "obsolete_plugins" | "search_console") => Promise<void> }) {
  const rows: Array<{ label: string; status: string | null; other: string | null; date: string | null; kind: "theme_plugins" | "obsolete_plugins" | "search_console"; cadence: string }> = [
    { label: "Theme & plugins up to date", status: w.theme_plugins_status, other: w.theme_plugins_status_other, date: w.theme_plugins_checked_at, kind: "theme_plugins", cadence: "monthly · 30 days" },
    { label: "Obsolete plugins deleted", status: w.obsolete_plugins, other: w.obsolete_plugins_other, date: w.obsolete_plugins_checked_at, kind: "obsolete_plugins", cadence: "quarterly · 90 days" },
    { label: "Search Console review", status: w.search_console_status, other: null, date: w.search_console_checked_at, kind: "search_console", cadence: "quarterly · 90 days" },
  ];
  return (
    <div className="grid gap-4">
      {rows.map((r) => (
        <Card key={r.kind} title={r.label} subtitle={r.cadence}>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-1">
              <ValueChip value={r.status} />
              {r.other && <div className="text-xs text-muted-foreground mt-1">{r.other}</div>}
              <div className="text-xs text-muted-foreground mt-1">Last checked: {r.date || "—"}</div>
            </div>
            <button onClick={() => onCheck(r.kind)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark checked today
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------- Notes ---------- */
function NotesTab({ w }: { w: Website }) {
  return (
    <Card title="Additional notes">
      <div className="text-sm whitespace-pre-wrap py-1">{w.notes || <span className="italic text-muted-foreground">No notes.</span>}</div>
      {w.import_notes && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Import notes</div>
          <div className="text-sm whitespace-pre-wrap text-muted-foreground">{w.import_notes}</div>
        </div>
      )}
    </Card>
  );
}


/* ---------- Activity ---------- */
function ActivityTab({ activity }: { activity: Array<{ id: string; summary: string | null; action: string; created_at: string }> }) {
  if (activity.length === 0) return <div className="text-sm text-muted-foreground">No activity yet.</div>;
  return (
    <Card title="Activity">
      <ul className="text-sm divide-y divide-border/50">
        {activity.map((a) => (
          <li key={a.id} className="py-2">
            <div>{a.summary ?? a.action}</div>
            <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
