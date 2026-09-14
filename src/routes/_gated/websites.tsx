import { Fragment, useEffect, useState, useMemo, useRef, useId } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/portal/AppShell";
import { categoryLabel } from "@/components/portal/Badges";
import { CredentialField } from "@/components/portal/CredentialField";
import { MultiCheckFilter } from "@/components/portal/MultiCheckFilter";
import {
  deleteCredential,
  deleteWebsite,
  getWebsiteFieldOptions,
  getApiStatus,
  listWebsites,
  updateCredentialField,
  updateWebsiteField,
  updateWebsiteFieldOption,
} from "@/lib/portal.functions";
import {
  WEBSITE_FIELD_OPTION_DEFAULTS,
  type WebsiteFieldOptionKey,
} from "@/lib/website-options";
import { ExternalLink, Search, ChevronDown, ChevronRight, Copy, Check, Eye, EyeOff, ChevronsDownUp, ChevronsUpDown, Pencil, Circle, Scan, Plus, Minus, MessageSquareMore, Trash2, CircleHelp, Mail, Share2, KeyRound } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";


const listOpts = (
  q: string,
  category: string,
  servers: string[],
  priorities: string[],
  wordpressTypes: Array<"wordpress" | "non_wordpress">,
  activities: Array<"active" | "inactive">,
) =>
  queryOptions({
    queryKey: ["websites", q, category, servers, priorities, wordpressTypes, activities],
    queryFn: () => listWebsites({ data: { q, category, servers, priorities, wordpressTypes, activities } }),
  });

const fieldOptionsQuery = queryOptions({
  queryKey: ["website-field-options"],
  queryFn: () => getWebsiteFieldOptions(),
});

const apiStatusQuery = queryOptions({
  queryKey: ["siteguard-api-status"],
  queryFn: () => getApiStatus(),
  staleTime: 30_000,
  refetchInterval: 60_000,
});

export const Route = createFileRoute("/_gated/websites")({
  head: () => ({
    meta: [
      { title: "Websites — Vault Portal" },
      { name: "description", content: "Interactive vertical spreadsheet of every website with editable monitoring fields, credentials and filters." },
      { property: "og:title", content: "Websites — Vault Portal" },
      { property: "og:description", content: "Interactive vertical spreadsheet of every website with editable monitoring fields, credentials and filters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(listOpts(
        "",
        "all",
        [...SERVER_OPTIONS],
        ["very_high", "high", "mid", "low"],
        ["wordpress", "non_wordpress"],
        ["active"],
      )),
      context.queryClient.ensureQueryData(fieldOptionsQuery),
      context.queryClient.ensureQueryData(apiStatusQuery),
    ]);
  },
  component: WebsitesPage,
});

const categories = ["all", "affiliate", "adsense_other", "dropship", "pbn", "portfolio", "client", "other"];
const SERVER_OPTIONS = ["ny2.wiwy.com", "ny1.wiwy.com", "da.wiwy.com", "External Server"];
const SERVER_FILTERS = SERVER_OPTIONS.map((value) => ({ value, label: value }));
const PRIORITY_FILTERS = [
  { value: "very_high", label: "Very high (9-10)" },
  { value: "high", label: "High (7-8)" },
  { value: "mid", label: "Mid (4-6)" },
  { value: "low", label: "Low (1-3)" },
];
const WORDPRESS_FILTERS = [
  { value: "wordpress", label: "WordPress only" },
  { value: "non_wordpress", label: "Non-WordPress only" },
];
const ACTIVITY_FILTERS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Non-active" },
];

type Tone = "green-strong" | "green" | "green-soft" | "amber" | "orange" | "red" | "pink" | "blue" | "grey" | "empty";
const toneClass: Record<Tone, string> = {
  "green-strong": "band-green-strong", green: "band-green", "green-soft": "band-green-soft",
  amber: "band-amber", orange: "band-orange", red: "band-red", pink: "band-pink",
  blue: "band-blue", grey: "band-grey", empty: "",
};

/* ============ Field options (dropdown values) ============ */

const OPT = WEBSITE_FIELD_OPTION_DEFAULTS;

/* ============ Colour logic ============ */

const LATEST_WP = [8, 3];
const LATEST_PHP = [8, 3];

function parseVersion(v: string): number[] | null {
  const m = v.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
}
function cmp(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}
function versionTone(val: string | null | undefined, latest: number[], oldMajor: number): Tone {
  if (!val) return "empty";
  if (/older/i.test(val)) return "pink";
  const p = parseVersion(val);
  if (!p) return "grey";
  if (cmp(p, latest) >= 0) return "green-strong";
  if (p[0] === latest[0]) return p[1] >= latest[1] - 1 ? "green" : "green-soft";
  if (p[0] === latest[0] - 1) return "amber";
  if (p[0] <= oldMajor) return "pink";
  return "orange";
}
function yesNoTone(val: string | null | undefined, invert = false): Tone {
  if (!val) return "empty";
  const s = val.toLowerCase().trim();
  if (/unsure|some|partial|watch/.test(s)) return "amber";
  if (/^n\/a/.test(s)) return "grey";
  const yes = /^(yes|enabled|installed|active|cleared|up to date|ok)/.test(s);
  const no = /^(no|disabled|none|missing|not connected|errors|needs)/.test(s);
  // "Disabled" is the good answer for comments/xml-rpc; handled by invert=false because option "Disabled" reads positive here.
  if (yes) return invert ? "red" : "green";
  if (no) return invert ? "green" : "red";
  return "blue";
}
function scoreTone(n: number): Tone {
  if (n >= 9) return "red";
  if (n >= 7) return "orange";
  if (n >= 5) return "amber";
  if (n >= 3) return "blue";
  return "grey";
}

/* ============ Metric definitions ============ */

type SiteRow = Awaited<ReturnType<typeof listWebsites>>[number];
type Metric = {
  label: string;
  key: string;
  tone: (site: SiteRow) => Tone;
  value: (site: SiteRow) => string | null | undefined;
  editable?: boolean;
  options?: readonly string[];
  optionKey?: WebsiteFieldOptionKey;
  input?: "select" | "text";
  tooltip?: string;
};
type MetricGroup = { title: string; accent: "blue" | "green" | "orange" | "red" | "grey"; metrics: Metric[] };

const V = (k: keyof SiteRow) => (s: SiteRow) => (s[k] as string | null) ?? null;

const CATEGORY_OPTIONS = ["affiliate", "adsense_other", "dropship", "pbn", "portfolio", "client", "premium", "other"];
const SCORE_OPTIONS = ["1","2","3","4","5","6","7","8","9","10"];

function formatLastCheck(iso: string | null | undefined): { short: string; full: string; tone: Tone } {
  if (!iso) return { short: "Not checked", full: "No maintenance checks recorded", tone: "grey" };
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  const days = Math.floor((+now - +d) / 86400000);
  const full = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  let short: string;
  if (days <= 0) short = "Today";
  else if (days === 1) short = "Yesterday";
  else if (days < 30) short = `${days}d ago`;
  else if (days < 365) short = `${Math.round(days / 30)}mo ago`;
  else short = `${Math.round(days / 365)}y ago`;
  const tone: Tone = days <= 30 ? "green" : days <= 60 ? "amber" : days <= 120 ? "orange" : "red";
  return { short, full, tone };
}

const GROUPS: MetricGroup[] = [
  {
    title: "Overview", accent: "blue",
    metrics: [
      { label: "Importance score (1–10)", key: "importance_score", tone: (s) => scoreTone(s.importance_score),
        value: (s) => String(s.importance_score), editable: true, options: SCORE_OPTIONS },
      { label: "Category", key: "category", tone: () => "grey",
        value: (s) => s.category, editable: true, options: CATEGORY_OPTIONS },
      { label: "Server", key: "server_label", tone: (s) => s.server_label ? "blue" : "grey",
        value: (s) => s.server_label, editable: true, options: SERVER_OPTIONS },
    ],
  },
  {
    title: "Maintenance", accent: "grey",
    metrics: [
      { label: "Last check", key: "last_check", tone: (s) => formatLastCheck(s.last_check).tone,
        value: (s) => formatLastCheck(s.last_check).short },
      { label: "Active or not active", key: "active_status", tone: (s) => s.active_status === "Active" ? "green" : "red",
        value: V("active_status"), editable: true, options: ["Active", "Not active"] },
      { label: "Obsolete plugins", key: "obsolete_plugins", tone: (s) => s.obsolete_plugins === "Other" ? "pink" : yesNoTone(s.obsolete_plugins),
        value: V("obsolete_plugins"), editable: true, options: OPT.obsolete_plugins, optionKey: "obsolete_plugins" },
    ],
  },

  {
    title: "WordPress & PHP", accent: "green",
    metrics: [
      { label: "WordPress version", key: "wordpress_version", tone: (s) => versionTone(s.wordpress_version, LATEST_WP, 6),
        value: V("wordpress_version"), editable: true, options: OPT.wordpress_version, optionKey: "wordpress_version" },
      { label: "Number of users", key: "wp_users", tone: (s) => s.wp_users ? "blue" : "empty",
        value: V("wp_users"), editable: true, options: OPT.wp_users, optionKey: "wp_users" },
      { label: "Auto-updates", key: "wordpress_auto_updates", tone: (s) => yesNoTone(s.wordpress_auto_updates),
        value: V("wordpress_auto_updates"), editable: true, options: OPT.wordpress_auto_updates, optionKey: "wordpress_auto_updates" },
      { label: "PHP version", key: "php_version", tone: (s) => versionTone(s.php_version, LATEST_PHP, 7),
        value: V("php_version"), editable: true, options: OPT.php_version, optionKey: "php_version" },
      { label: "Latest theme", key: "latest_theme", tone: (s) => yesNoTone(s.latest_theme),
        value: V("latest_theme"), editable: true, options: OPT.latest_theme, optionKey: "latest_theme" },
      { label: "Custom WP plugins name", key: "custom_wp_plugins", tone: (s) => s.custom_wp_plugins ? "blue" : "empty",
        value: V("custom_wp_plugins"), editable: true, input: "text" },
      { label: "Media URL Permalink", key: "media_url_permalink", tone: (s) => s.media_url_permalink === "Disabled" ? "green" : yesNoTone(s.media_url_permalink),
        value: V("media_url_permalink"),
        tooltip: "This is the setting under Settings > Media labelled “Organize my uploads into month- and year-based folders”. It should remain disabled." },
    ],
  },
  {
    title: "Security & Hardening", accent: "red",
    metrics: [
      { label: "Security plugin", key: "security_plugin", tone: (s) => s.security_plugin && !/none/i.test(s.security_plugin) ? "green" : yesNoTone(s.security_plugin),
        value: V("security_plugin"), editable: true, options: OPT.security_plugin, optionKey: "security_plugin" },
      { label: "Firewall", key: "firewall", tone: (s) => yesNoTone(s.firewall), value: V("firewall"), editable: true, options: OPT.firewall, optionKey: "firewall" },
      { label: "CAPTCHA protection", key: "captcha_protection", tone: (s) => yesNoTone(s.captcha_protection), value: V("captcha_protection"), editable: true, options: OPT.captcha_protection, optionKey: "captcha_protection" },
      { label: "XML-RPC disabled", key: "xml_rpc_disabled", tone: (s) => yesNoTone(s.xml_rpc_disabled), value: V("xml_rpc_disabled"), editable: true, options: OPT.xml_rpc_disabled, optionKey: "xml_rpc_disabled" },
      { label: "Comments & pings", key: "comments_pings", tone: (s) => yesNoTone(s.comments_pings), value: V("comments_pings"), editable: true, options: OPT.comments_pings, optionKey: "comments_pings" },
      { label: "GDPR banner", key: "gdpr_banner", tone: (s) => yesNoTone(s.gdpr_banner), value: V("gdpr_banner"), editable: true, options: OPT.gdpr_banner, optionKey: "gdpr_banner" },
      { label: "rel noopener, noreferrer", key: "external_link_security", tone: (s) => yesNoTone(s.external_link_security), value: V("external_link_security"), editable: true, options: OPT.external_link_security, optionKey: "external_link_security",
        tooltip: "Checks that external links use rel=\"noopener\" and rel=\"noreferrer\" where appropriate, preventing the opened page from controlling the original tab and limiting referrer data." },
      { label: "Uptime Robot", key: "uptime_robot", tone: (s) => yesNoTone(s.uptime_robot), value: V("uptime_robot"), editable: true, options: OPT.uptime_robot, optionKey: "uptime_robot" },
    ],
  },
  {
    title: "Site Speed", accent: "orange",
    metrics: [
      { label: "Caching plugin", key: "caching_plugin", tone: (s) => s.caching_plugin && !/none/i.test(s.caching_plugin) ? "green" : yesNoTone(s.caching_plugin),
        value: V("caching_plugin"), editable: true, options: OPT.caching_plugin, optionKey: "caching_plugin" },
      { label: "Image compression", key: "image_compression", tone: (s) => yesNoTone(s.image_compression),
        value: V("image_compression"), editable: true, options: OPT.image_compression, optionKey: "image_compression" },
    ],
  },
  {
    title: "SEO", accent: "blue",
    metrics: [
      { label: "SEO plugin", key: "seo_plugin", tone: (s) => s.seo_plugin && !/none/i.test(s.seo_plugin) ? "green" : yesNoTone(s.seo_plugin),
        value: V("seo_plugin"), editable: true, options: OPT.seo_plugin, optionKey: "seo_plugin" },
      { label: "Publish dates removed", key: "publish_dates_removed", tone: (s) => yesNoTone(s.publish_dates_removed),
        value: V("publish_dates_removed"), editable: true, options: OPT.publish_dates_removed, optionKey: "publish_dates_removed" },
      { label: "Misc links no-followed", key: "misc_links_nofollow", tone: (s) => yesNoTone(s.misc_links_nofollow),
        value: V("misc_links_nofollow"), editable: true, options: OPT.misc_links_nofollow, optionKey: "misc_links_nofollow" },
      { label: "Social links no-followed", key: "social_links_nofollow", tone: (s) => yesNoTone(s.social_links_nofollow),
        value: V("social_links_nofollow"), editable: true, options: OPT.social_links_nofollow, optionKey: "social_links_nofollow" },
      { label: "Amazon links no-followed", key: "amazon_links_nofollow", tone: (s) => s.category === "affiliate" ? yesNoTone(s.amazon_links_nofollow) : "empty",
        value: (s) => s.category === "affiliate" ? (s.amazon_links_nofollow ?? null) : "—", editable: true, options: OPT.amazon_links_nofollow, optionKey: "amazon_links_nofollow" },
      { label: "Search Console", key: "search_console_status", tone: (s) => yesNoTone(s.search_console_status),
        value: V("search_console_status"), editable: true, options: OPT.search_console_status, optionKey: "search_console_status" },
    ],
  },
  {
    title: "PPC", accent: "red",
    metrics: [
      { label: "PPC status", key: "ppc_enabled", tone: (s) => /pending/i.test(s.ppc_enabled ?? "") ? "amber" : /^(yes|enabled)/i.test(s.ppc_enabled ?? "") ? "red" : "empty",
        value: V("ppc_enabled"), editable: true, options: OPT.ppc_enabled, optionKey: "ppc_enabled" },
    ],
  },
];

const WORDPRESS_ONLY_METRIC_KEYS = new Set([
  "obsolete_plugins",
  "wordpress_version",
  "wp_users",
  "wordpress_auto_updates",
  "latest_theme",
  "custom_wp_plugins",
  "media_url_permalink",
  "security_plugin",
  "firewall",
  "xml_rpc_disabled",
  "comments_pings",
  "seo_plugin",
]);

const INACTIVE_NA_METRIC_KEYS = new Set([
  "php_version",
  "gdpr_banner",
  "external_link_security",
  "caching_plugin",
  "image_compression",
  "seo_plugin",
  "publish_dates_removed",
  "misc_links_nofollow",
  "social_links_nofollow",
  "amazon_links_nofollow",
  "search_console_status",
]);


const accentBar: Record<MetricGroup["accent"], string> = {
  blue: "bg-info", green: "bg-success", orange: "bg-pending", red: "bg-danger", grey: "bg-muted-foreground",
};

function cleanUrl(u: string) {
  return u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

/* ============ Editable cell ============ */

function EditableCell({
  value,
  options,
  tone,
  empty,
  onChange,
  format,
  emptyLabel = "—",
  allowEmpty = true,
  onAddOption,
  onRemoveOption,
  detail,
  onDetailCommit,
}: {
  value: string | null | undefined;
  options: readonly string[];
  tone: Tone;
  empty: boolean;
  onChange: (v: string | null) => void;
  format?: (v: string) => string;
  emptyLabel?: string;
  allowEmpty?: boolean;
  onAddOption?: (option: string) => void;
  onRemoveOption?: (option: string) => void;
  detail?: string | null;
  onDetailCommit?: (detail: string | null) => void;
}) {
  const [newOption, setNewOption] = useState("");
  const [detailDraft, setDetailDraft] = useState(detail ?? "");
  const displayedOptions = value && !options.includes(value) ? [value, ...options] : options;
  const displayedValue = value ? (format ? format(value) : value) : emptyLabel;
  const selectWidth = `${Math.min(Math.max(displayedValue.length + 3, 7), 24)}ch`;
  return (
    <div className="flex min-h-8 items-center justify-center gap-0 px-0.5">
      <div className="relative min-w-0 shrink">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          style={{ width: selectWidth }}
          className={`max-w-full appearance-none cursor-pointer rounded border-0 bg-transparent py-1 pl-1.5 pr-4 text-center text-[12px] font-bold focus:outline-none focus:ring-1 focus:ring-ring ${empty ? "text-muted-foreground/60" : ""} ${!empty ? toneClass[tone] : ""}`}
        >
          {allowEmpty && <option value="">{emptyLabel}</option>}
          {displayedOptions.map((o) => <option key={o} value={o}>{format ? format(o) : o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 text-current opacity-65" />
      </div>

      {onDetailCommit && (value === "Unsure" || value === "Other") && (
        <Popover onOpenChange={(open) => open && setDetailDraft(detail ?? "")}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={detail ? `View ${value} notes` : `Explain ${value}`}
              title={detail ? `${value} (${detail})` : `Explain ${value}`}
              className={`shrink-0 rounded p-0.5 transition hover:bg-background/60 ${detail ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground"}`}
            >
              <MessageSquareMore className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-72 space-y-2 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Add detail for “{value}”</div>
            <textarea
              value={detailDraft}
              onChange={(event) => setDetailDraft(event.target.value.slice(0, 500))}
              placeholder="Add the detail behind this selection…"
              className="min-h-24 w-full resize-y rounded-md border border-border bg-muted px-2 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onDetailCommit(detailDraft.trim() || null)}
                className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
              >
                Save note
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {onAddOption && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Add dropdown option" title="Add an option" className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-background/60 hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-64 space-y-2 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Add an option</div>
            <input
              value={newOption}
              onChange={(event) => setNewOption(event.target.value.slice(0, 80))}
              placeholder="New dropdown value"
              className="w-full rounded-md border border-border bg-muted px-2 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              disabled={!newOption.trim()}
              onClick={() => {
                const next = newOption.trim();
                if (!next) return;
                onAddOption(next);
                setNewOption("");
              }}
              className="w-full rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40"
            >
              Add option
            </button>
          </PopoverContent>
        </Popover>
      )}

      {onRemoveOption && (
        <button
          type="button"
          disabled={!value || options.length <= 1}
          onClick={() => value && onRemoveOption(value)}
          aria-label="Remove selected dropdown option"
          title={value ? `Remove “${value}” from this dropdown` : "Select an option to remove"}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-25"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function TextCell({
  value, tone, empty, onCommit,
}: {
  value: string | null | undefined;
  tone: Tone;
  empty: boolean;
  onCommit: (v: string | null) => void;
}) {
  const [local, setLocal] = useState(value ?? "");
  const listId = useId();
  return (
    <>
      <input
        type="text"
        list={listId}
        value={local}
        onChange={(e) => setLocal(e.target.value.slice(0, 120))}
        onBlur={() => {
          const next = local.trim();
          if (next === (value ?? "")) return;
          onCommit(next === "" ? null : next);
        }}
        placeholder="Name, Needed or Unsure"
        className={`w-full rounded border-0 bg-transparent px-1 py-1 text-center text-[12px] font-bold focus:outline-none focus:ring-1 focus:ring-ring ${empty ? "text-muted-foreground/60" : toneClass[tone]}`}
      />
      <datalist id={listId}>
        <option value="Needed" />
        <option value="Unsure" />
      </datalist>
    </>
  );
}


/* ============ Expandable credential rows ============ */

type CredMeta = { id: string; login_url: string | null; username: string | null; label: string | null };

function CopyText({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className={`p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground ${className}`}
      aria-label="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

/** Fake social credentials for mockup (deterministic per host). */
function socialFor(s: SiteRow) {
  const host = s.url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  const handle = "@" + host.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    login_url: "https://www.facebook.com/login",
    username: `social+${host}@wiwy.co`,
    password: "FakeSocial123!",
    handle,
  };
}

type LoginKind = "wp" | "cpanel" | "gmail" | "social";

function RevealCell({ kind, site }: { kind: LoginKind; site: SiteRow }) {
  const updateCredFn = useServerFn(updateCredentialField);
  const updateWebsiteFn = useServerFn(updateWebsiteField);
  const qc = useQueryClient();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch { /* noop */ }
  };

  let initialUrl = "";
  let initialUser = "";
  let credentialId: string | undefined;
  const websiteId: string | undefined = site.id;
  let fakePassword: string | null = null;
  let missingCredential = false;
  const accessField =
    kind === "wp" ? "uses_wordpress"
    : kind === "cpanel" ? "cpanel_access_state"
    : kind === "gmail" ? "gmail_access_state"
    : "social_access_state";
  const accessValue =
    kind === "wp" ? (site.uses_wordpress ? "wordpress" : "not_wordpress")
    : kind === "cpanel" ? site.cpanel_access_state
    : kind === "gmail" ? site.gmail_access_state
    : site.social_access_state;
  const accessOptions =
    kind === "wp"
      ? [{ value: "wordpress", label: "WordPress" }, { value: "not_wordpress", label: "Not WordPress" }]
      : kind === "cpanel"
        ? [
            { value: "available", label: "Login available" },
            { value: "not_given", label: "Not given" },
            { value: "not_applicable", label: "N/A" },
          ]
        : [{ value: "required", label: "Required" }, { value: "not_required", label: "Not required" }];
  const accessAvailable =
    accessValue !== "not_wordpress"
    && accessValue !== "not_required"
    && accessValue !== "not_given"
    && accessValue !== "not_applicable";

  if (kind === "wp") {
    const c = site.wp_credential as CredMeta | null;
    if (!c) {
      missingCredential = true;
      initialUrl = `${site.url.replace(/\/$/, "")}/wp-admin`;
    } else {
      initialUrl = c.login_url || `${site.url.replace(/\/$/, "")}/wp-admin`;
      initialUser = c.username || "goadmin";
      credentialId = c.id;
    }
  } else if (kind === "cpanel") {
    const c = site.cpanel_credential as CredMeta | null;
    if (!c) {
      missingCredential = true;
      initialUrl = site.server_label
        ? `https://${site.server_label}:2083`
        : "";
    } else {
      initialUrl = c.login_url || "";
      initialUser = c.username || "";
      credentialId = c.id;
    }
  } else if (kind === "gmail") {
    const c = site.gmail_credential as CredMeta | null;
    if (!c) {
      missingCredential = true;
      initialUrl = "https://mail.google.com";
    } else {
      initialUrl = c.login_url || "https://mail.google.com";
      initialUser = c.username || "";
      credentialId = c.id;
    }
  } else {
    const soc = socialFor(site);
    initialUrl = soc.login_url;
    initialUser = soc.username;
    fakePassword = soc.password;
  }

  const [url, setUrl] = useState(initialUrl);
  const [user, setUser] = useState(initialUser);
  const [pw, setPw] = useState(fakePassword ?? "");

  const titleText =
    kind === "wp" ? "WordPress login"
    : kind === "cpanel" ? "cPanel login"
    : kind === "gmail" ? "Gmail login"
    : "Social logins";

  const save = async () => {
    if (kind === "social") return;
    await updateCredFn({
      data: {
        id: credentialId,
        website_id: site.id,
        kind: kind === "wp" ? "wordpress" : kind,
        login_url: url,
        username: user,
        password: passwordChanged && pw ? pw : undefined,
      },
    });
    await qc.invalidateQueries({ queryKey: ["websites"] });
    setPasswordChanged(false);
    setEditing(false);
  };
  const saveAccessState = async (next: string) => {
    await updateWebsiteFn({
      data: {
        website_id: site.id,
        field: accessField,
        value: kind === "wp" ? String(next === "wordpress") : next,
      },
    });
    qc.invalidateQueries({ queryKey: ["websites"] });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {accessAvailable && (
        <Popover onOpenChange={(open) => {
          if (open && missingCredential) setEditing(true);
        }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11.5px] md:text-[12.5px] text-info underline decoration-dotted decoration-info/70 underline-offset-4 hover:decoration-solid"
            >
              <Eye className="w-3.5 h-3.5" />
              {missingCredential ? "Add login" : "Reveal"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-80 p-3 space-y-2 text-[12.5px]">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-foreground text-[12px] uppercase tracking-wide">{titleText}</div>
          {!missingCredential && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="text-[10.5px] text-info hover:underline"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Login URL</div>
          {editing || missingCredential ? (
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              className="w-full font-mono text-[12px] bg-muted rounded px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-ring" />
          ) : (
            <div className="flex items-center gap-1">
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="text-info hover:underline inline-flex items-center gap-1 truncate">
                Login URL <ExternalLink className="w-3 h-3" />
              </a>
              <button onClick={() => copy("url", url)} className="ml-auto p-1 rounded hover:bg-muted" aria-label="Copy URL">
                {copiedKey === "url" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Username</div>
          {editing || missingCredential ? (
            <input value={user} onChange={(e) => setUser(e.target.value)}
              className="w-full font-mono text-[12px] bg-muted rounded px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-ring" />
          ) : (
            <div className="flex items-center gap-1">
              <code className="font-mono flex-1 bg-muted rounded px-2 py-1 truncate">{user || "—"}</code>
              <button onClick={() => copy("user", user)} className="p-1 rounded hover:bg-muted" aria-label="Copy username">
                {copiedKey === "user" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Password</div>
          {editing || missingCredential ? (
            <input
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setPasswordChanged(true);
              }}
              placeholder={missingCredential ? "Enter password" : "Leave blank to keep current password"}
              type="password"
              autoComplete="new-password"
              className="w-full font-mono text-[12px] bg-muted rounded px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : credentialId ? (
            <CredentialField credentialId={credentialId} websiteId={websiteId} label={titleText} />
          ) : (
            <div className="flex items-center gap-1">
              <code className="font-mono flex-1 bg-muted rounded px-2 py-1 truncate">{pw}</code>
              <button onClick={() => copy("pw", pw)} className="p-1 rounded hover:bg-muted" aria-label="Copy password">
                {copiedKey === "pw" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {(editing || missingCredential) && (
          <div className="flex justify-end pt-1">
            <button
              type="button" onClick={save}
              className="px-3 py-1 text-[11px] font-semibold rounded bg-primary text-primary-foreground hover:opacity-90"
            >
              Save
            </button>
          </div>
        )}
          </PopoverContent>
        </Popover>
      )}
      <select
        value={accessValue}
        onChange={(event) => saveAccessState(event.target.value)}
        aria-label={`${titleText} requirement for ${site.name}`}
        className="max-w-[112px] cursor-pointer rounded-md border border-border/70 bg-background/70 px-1.5 py-1 text-[11px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {accessOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}


function RowLabelCell({
  label,
  disabled = false,
  onToggle,
  className = "",
  tooltip,
  centered = false,
}: {
  label: string;
  disabled?: boolean;
  onToggle?: () => void;
  className?: string;
  tooltip?: string;
  centered?: boolean;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const openTooltip = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setTooltipOpen(true);
  };
  const closeTooltip = () => {
    closeTimer.current = window.setTimeout(() => setTooltipOpen(false), 120);
  };

  return (
    <th className={`sticky left-0 z-10 bg-muted group-hover:bg-muted ${centered ? "text-center" : "text-left"} px-3 py-2 font-medium border-b border-r border-border ${disabled ? "text-muted-foreground line-through" : "text-foreground"} ${className}`}>
      <div className="flex items-center gap-2">
        {onToggle && (
          <button
            type="button" onClick={onToggle}
            className={`shrink-0 p-0.5 rounded hover:bg-background/60 ${disabled ? "text-muted-foreground" : "text-info"}`}
            aria-label={disabled ? "Enable row" : "Disable row"}
            title={disabled ? "Enable row" : "Mark as unimportant"}
          >
            {disabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <span className="flex-1">{label}</span>
        {tooltip && (
          <Popover open={tooltipOpen} onOpenChange={setTooltipOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 cursor-help rounded text-info hover:text-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info"
                aria-label={`About ${label}`}
                onMouseEnter={openTooltip}
                onMouseLeave={closeTooltip}
                onFocus={openTooltip}
                onBlur={closeTooltip}
              >
                <CircleHelp className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="center"
              sideOffset={8}
              className="z-[100] w-72 p-3 text-xs font-medium leading-relaxed"
              onMouseEnter={openTooltip}
              onMouseLeave={closeTooltip}
            >
              {tooltip}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </th>
  );
}

function RevealLoginRow({ label, kind, sites, zebra, disabled, onToggle }: {
  label: string; kind: LoginKind; sites: SiteRow[]; zebra: (i: number) => string; disabled: boolean; onToggle: () => void;
}) {
  return (
    <tr className={`group ${disabled ? "opacity-50" : ""}`}>
      <RowLabelCell label={label} disabled={disabled} onToggle={onToggle} />
      {sites.map((s, i) => (
        <td key={s.id} className={`border-b border-r border-border px-2 py-2 text-center align-middle ${zebra(i)} ${disabled ? "line-through" : ""}`}>
          {disabled ? <span className="text-muted-foreground/50 text-[11px]">—</span> : <RevealCell kind={kind} site={s} />}
        </td>
      ))}
    </tr>
  );
}

type CollectionCredential = {
  id: string;
  kind: string;
  login_url: string | null;
  username: string | null;
  label: string | null;
  notes: string | null;
};

const SOCIAL_KINDS = ["facebook", "twitter", "pinterest", "instagram"] as const;
type SocialKind = typeof SOCIAL_KINDS[number];

function CredentialCollectionCell({
  site,
  mode,
}: {
  site: SiteRow;
  mode: "email" | "social" | "other";
}) {
  const updateFn = useServerFn(updateCredentialField);
  const removeFn = useServerFn(deleteCredential);
  const qc = useQueryClient();
  const items = (
    mode === "email"
      ? site.email_credentials
      : mode === "social"
        ? site.social_credentials
        : site.other_credentials
  ) as CollectionCredential[];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<SocialKind>("facebook");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setUsername("");
    setPassword("");
    setLoginUrl("");
    setLabel("");
    setKind("facebook");
  };
  const edit = (credential: CollectionCredential) => {
    setEditingId(credential.id);
    setUsername(credential.username ?? "");
    setPassword("");
    setLoginUrl(credential.login_url ?? "");
    setLabel(credential.label ?? "");
    if (mode === "social" && SOCIAL_KINDS.includes(credential.kind as SocialKind)) {
      setKind(credential.kind as SocialKind);
    }
  };
  const save = async () => {
    if (!username.trim() && !loginUrl.trim()) return;
    setSaving(true);
    try {
      await updateFn({
        data: {
          id: editingId ?? undefined,
          website_id: site.id,
          kind: mode === "social" ? kind : "other",
          label: mode === "email"
            ? "Email login"
            : mode === "social"
              ? kind.charAt(0).toUpperCase() + kind.slice(1)
              : label.trim() || "Other login",
          credential_type:
            mode === "email"
              ? "email_login"
              : mode === "other"
                ? "other_login"
                : undefined,
          login_url: loginUrl.trim() || null,
          username: username.trim() || null,
          password: password || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: ["websites"] });
      resetForm();
    } finally {
      setSaving(false);
    }
  };
  const remove = async (credential: CollectionCredential) => {
    const descriptor = credential.username || credential.label || "this login";
    if (!window.confirm(`Remove ${descriptor} from ${site.name}?`)) return;
    await removeFn({ data: { id: credential.id } });
    await qc.invalidateQueries({ queryKey: ["websites"] });
    if (editingId === credential.id) resetForm();
  };

  return (
    <Popover onOpenChange={(open) => !open && resetForm()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-info underline decoration-dotted underline-offset-4 hover:decoration-solid"
        >
          {mode === "email"
            ? <Mail className="h-3.5 w-3.5" />
            : mode === "social"
              ? <Share2 className="h-3.5 w-3.5" />
              : <KeyRound className="h-3.5 w-3.5" />}
          {mode === "other"
            ? (items.length > 0 ? "Yes" : "—")
            : items.length > 0
              ? `${items.length} ${mode === "email" ? "email" : "social"}${items.length === 1 ? "" : "s"}`
              : "No"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[360px] space-y-3 p-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {mode === "email" ? "Email logins" : mode === "social" ? "Social logins" : "Other logins"} · {site.name}
          </div>
          <button type="button" onClick={resetForm} className="text-[11px] font-bold text-info hover:underline">
            Add new
          </button>
        </div>

        {items.length > 0 && (
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {items.map((credential) => (
              <div key={credential.id} className="rounded-lg border border-border bg-muted/35 p-2">
                <div className="mb-1 flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold">
                      {credential.username || credential.label || "Login"}
                    </div>
                    {mode === "social" && (
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{credential.kind}</div>
                    )}
                  </div>
                  <button type="button" onClick={() => edit(credential)} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground" aria-label="Edit login">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(credential)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" aria-label="Remove login">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <CredentialField credentialId={credential.id} websiteId={site.id} label={`${credential.label || credential.kind} password`} />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-border p-2">
          {mode === "social" && (
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as SocialKind)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] font-bold"
            >
              {SOCIAL_KINDS.map((socialKind) => (
                <option key={socialKind} value={socialKind}>
                  {socialKind.charAt(0).toUpperCase() + socialKind.slice(1)}
                </option>
              ))}
            </select>
          )}
          {mode === "other" && (
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Service or website name"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] font-bold"
            />
          )}
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={mode === "email" ? "Email address" : mode === "social" ? "Username or handle" : "Username"}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px]"
          />
          <input
            value={loginUrl}
            onChange={(event) => setLoginUrl(event.target.value)}
            placeholder={mode === "email" ? "Webmail URL (optional)" : mode === "social" ? "Profile or login URL" : "Login URL (optional)"}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px]"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={editingId ? "Leave blank to keep password" : "Password (optional)"}
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px]"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving || (!username.trim() && !loginUrl.trim())}
              className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-45"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Add login"}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CredentialCollectionRow({
  label,
  mode,
  sites,
  zebra,
  disabled,
  onToggle,
}: {
  label: string;
  mode: "email" | "social" | "other";
  sites: SiteRow[];
  zebra: (i: number) => string;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className={`group ${disabled ? "opacity-50" : ""}`}>
      <RowLabelCell label={label} disabled={disabled} onToggle={onToggle} />
      {sites.map((site, index) => (
        <td key={site.id} className={`border-b border-r border-border px-2 py-2 text-center align-middle ${zebra(index)} ${disabled ? "line-through" : ""}`}>
          {disabled
            ? <span className="text-[11px] text-muted-foreground/50">—</span>
            : <CredentialCollectionCell site={site} mode={mode} />}
        </td>
      ))}
    </tr>
  );
}

/* ============ Notes cell (basic rich text) ============ */

const ALLOWED_NOTE_TAGS = new Set(["strong", "b", "em", "i", "ul", "ol", "li", "p", "div", "br"]);

function escapeNoteText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
}

function sanitiseNotesHtml(value: string) {
  let output = "";
  let cursor = 0;
  for (const match of value.matchAll(/<[^>]*>/g)) {
    const index = match.index ?? 0;
    output += escapeNoteText(value.slice(cursor, index));
    const raw = match[0];
    const parsed = raw.match(/^<\s*(\/?)\s*([a-z0-9]+)(?:\s[^>]*)?\/?\s*>$/i);
    if (parsed) {
      const closing = parsed[1] === "/";
      const tag = parsed[2].toLowerCase();
      if (ALLOWED_NOTE_TAGS.has(tag)) {
        const normalised = tag === "b" ? "strong" : tag === "i" ? "em" : tag === "div" ? "p" : tag;
        output += normalised === "br" ? "<br>" : `<${closing ? "/" : ""}${normalised}>`;
      }
    }
    cursor = index + raw.length;
  }
  output += escapeNoteText(value.slice(cursor));
  return output.trim();
}

function notesAsPlainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function NotesCell({
  site,
  label,
  value,
  onCommit,
}: {
  site: SiteRow;
  label: string;
  value: string | null | undefined;
  onCommit: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(sanitiseNotesHtml(value ?? ""));
  const editorRef = useRef<HTMLDivElement>(null);
  const storedValue = value ?? "";
  const preview = sanitiseNotesHtml(storedValue);
  const previewText = notesAsPlainText(preview);
  const format = (command: "bold" | "italic" | "insertUnorderedList") => {
    editorRef.current?.focus();
    document.execCommand(command);
  };
  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setDraft(sanitiseNotesHtml(storedValue)); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group/notes w-full rounded px-2 py-1.5 text-center hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={preview ? `Edit ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
        >
          {preview ? (
            <div className="flex items-start justify-center gap-1.5">
              <div
                className="flex-1 overflow-hidden text-center text-[11.5px] leading-snug text-foreground/90 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-bold [&_ul]:list-disc"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                title={previewText}
                dangerouslySetInnerHTML={{ __html: preview }}
              />
              <Pencil className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover/notes:opacity-100 transition-opacity" />
            </div>
          ) : (
            <span className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground/70 italic">
              <Pencil className="w-3 h-3" /> Add notes
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-80 p-3 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label} · {site.name}
        </div>
        <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-border bg-muted/60 p-1">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")} className="h-7 w-7 rounded text-xs font-black hover:bg-background" title="Bold">B</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("italic")} className="h-7 w-7 rounded font-serif text-xs italic hover:bg-background" title="Italic">I</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("insertUnorderedList")} className="h-7 rounded px-2 text-xs font-semibold hover:bg-background" title="Bullet list">• List</button>
        </div>
        <div
          key={`${site.id}-${open ? "open" : "closed"}`}
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Anything worth remembering about this site…"
          className="min-h-32 max-h-64 w-full overflow-y-auto rounded-b-md border border-border bg-muted px-2 py-2 text-[12.5px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_em]:italic [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:font-bold [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: draft }}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => { setDraft(sanitiseNotesHtml(storedValue)); setOpen(false); }}
            className="px-3 py-1 text-[11px] rounded border border-border hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const next = sanitiseNotesHtml(editorRef.current?.innerHTML ?? draft);
              const prev = sanitiseNotesHtml(storedValue);
              if (next !== prev) onCommit(next === "" ? null : next);
              setOpen(false);
            }}
            className="px-3 py-1 text-[11px] font-semibold rounded bg-primary text-primary-foreground hover:opacity-90"
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LastCheckCell({
  site,
  onChange,
  zebraClass = "",
}: {
  site: SiteRow;
  onChange: (v: string | null) => void;
  zebraClass?: string;
}) {
  const status = site.last_check_status ?? "";
  const info = formatLastCheck(site.last_check);
  const tone: Tone =
    status === "today" ? "green"
    : status === "laraib_to_check" ? "amber"
    : status === "pending" ? "amber"
    : status === "unknown" ? "grey"
    : info.tone;
  const date = status === "today" || status === "" ? (site.last_check ? info.full : "") : "";

  return (
    <div className={`flex min-h-[45px] flex-col justify-center ${toneClass[tone] || zebraClass}`}>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        aria-label={`Last check for ${site.name}`}
        className="w-full cursor-pointer border-0 bg-transparent px-1 py-1 text-center text-[12px] font-bold focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">{info.short}</option>
        <option value="today">Today</option>
        <option value="unknown">Unknown</option>
        <option value="laraib_to_check">Laraib to check</option>
        <option value="pending">Pending</option>
      </select>
      {date && <span className="pb-1 text-[9.5px] text-muted-foreground">{date}</span>}
    </div>
  );
}

function websiteHeaderBackground(index: number) {
  return index % 2 === 0
    ? "linear-gradient(145deg, oklch(0.19 0.04 260), oklch(0.165 0.05 260))"
    : "linear-gradient(145deg, oklch(0.27 0.04 260), oklch(0.235 0.05 260))";
}



/* ============ Page ============ */

function WebsitesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [servers, setServers] = useState<string[]>([...SERVER_OPTIONS]);
  const [priorities, setPriorities] = useState<string[]>(["very_high", "high", "mid", "low"]);
  const [wordpressTypes, setWordpressTypes] = useState<Array<"wordpress" | "non_wordpress">>(["wordpress", "non_wordpress"]);
  const [activities, setActivities] = useState<Array<"active" | "inactive">>(["active"]);
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [disabledRows, setDisabledRows] = useState<Record<string, boolean>>({
    "cred-gmail": true,
    "cred-email": true,
    "cred-social": true,
    "cred-other": true,
    "WordPress & PHP-custom_wp_plugins": true,
    "Security & Hardening-uptime_robot": true,
    "Security & Hardening-captcha_protection": true,
    "Site Speed-caching_plugin": true,
    "Site Speed-image_compression": true,
    "SEO-seo_plugin": true,
    "SEO-publish_dates_removed": true,
    "SEO-misc_links_nofollow": true,
    "SEO-social_links_nofollow": true,
    "SEO-amazon_links_nofollow": true,
    "SEO-search_console_status": true,
    "PPC-ppc_enabled": true,
  });
  const [focusedSiteId, setFocusedSiteId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState(-1);
  const [priorityIndex, setPriorityIndex] = useState(0);
  const { data = [] } = useQuery(listOpts(q, cat, servers, priorities, wordpressTypes, activities));
  const { data: managedOptions = WEBSITE_FIELD_OPTION_DEFAULTS } = useQuery(fieldOptionsQuery);
  const { data: apiStatus } = useQuery(apiStatusQuery);
  const qc = useQueryClient();
  const updateFn = useServerFn(updateWebsiteField);
  const updateOptionFn = useServerFn(updateWebsiteFieldOption);
  const deleteWebsiteFn = useServerFn(deleteWebsite);
  const mutation = useMutation({
    mutationFn: (v: { website_id: string; field: string; value: string | null }) => updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["websites"] }),
  });
  const optionMutation = useMutation({
    mutationFn: (payload: { field: WebsiteFieldOptionKey; action: "add" | "remove"; option: string }) =>
      updateOptionFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["website-field-options"] }),
  });
  const websiteDeleteMutation = useMutation({
    mutationFn: (id: string) => deleteWebsiteFn({ data: { id } }),
    onSuccess: async () => {
      setFocusedSiteId(null);
      await qc.invalidateQueries({ queryKey: ["websites"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const addOption = (field: WebsiteFieldOptionKey, option: string) => {
    optionMutation.mutate({ field, action: "add", option });
  };
  const removeOption = (field: WebsiteFieldOptionKey, option: string) => {
    if (!window.confirm(`Remove “${option}” from this dropdown for everyone? Existing website values will be preserved.`)) return;
    optionMutation.mutate({ field, action: "remove", option });
  };

  const sites = data;
  const focusedSite = focusedSiteId ? sites.find((site) => site.id === focusedSiteId) ?? null : null;
  const focusedColumn = focusedSiteId ? sites.findIndex((site) => site.id === focusedSiteId) + 2 : -1;
  const activeColumn = hoveredColumn > 1 ? hoveredColumn : focusedColumn;
  const prioritySites = useMemo(
    () =>
      sites
        .filter((site) => site.importance_score >= 8 && notesAsPlainText(site.notes ?? "").length > 0)
        .sort((a, b) => a.importance_score - b.importance_score || a.name.localeCompare(b.name)),
    [sites],
  );
  const priorityKey = prioritySites.map((site) => `${site.id}:${site.importance_score}:${site.notes ?? ""}`).join("|");
  const prioritySite = prioritySites.length > 0 ? prioritySites[priorityIndex % prioritySites.length] : null;
  const priorityNoteText = prioritySite
    ? notesAsPlainText(sanitiseNotesHtml(prioritySite.notes ?? "")).replace(/[.]\s*$/, "")
    : "";

  useEffect(() => {
    setPriorityIndex(0);
    if (prioritySites.length < 2) return;
    const timer = window.setInterval(() => {
      setPriorityIndex((current) => (current + 1) % prioritySites.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [priorityKey, prioritySites.length]);

  const toggleSection = (title: string) => setCollapsed((p) => ({ ...p, [title]: !p[title] }));
  const toggleRow = (key: string) => setDisabledRows((p) => ({ ...p, [key]: !p[key] }));
  const toggleSiteFocus = (siteId: string) => {
    const next = focusedSiteId === siteId ? null : siteId;
    setFocusedSiteId(next);
    if (next) {
      window.requestAnimationFrame(() => {
        document.getElementById(`website-column-${siteId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
    }
  };
  const removeFocusedSite = () => {
    if (!focusedSite) return;
    const confirmed = window.confirm(
      `Delete ${focusedSite.name} from the portal?\n\nThis also removes its stored credentials and cannot be undone.`,
    );
    if (confirmed) websiteDeleteMutation.mutate(focusedSite.id);
  };

  const fullRowCount = 4 + GROUPS.reduce((count, group) => count + group.metrics.length, 0) + 2;
  const compactRowCount = 6;
  const extraFieldCount = fullRowCount - compactRowCount;

  const zebra = (i: number) => (i % 2 === 1 ? "bg-muted/20" : "bg-transparent");

  const notesRow = () => (
    <tr className="group">
      <RowLabelCell label="Additional notes" centered />
      {sites.map((s, i) => (
        <td key={s.id} className={`border-b border-r border-border p-0 align-top ${zebra(i)}`}>
          <NotesCell
            site={s}
            label="Additional notes"
            value={s.notes}
            onCommit={(v) => mutation.mutate({ website_id: s.id, field: "notes", value: v })}
          />
        </td>
      ))}
    </tr>
  );

  const laraibNotesRow = () => (
    <tr className="group">
      <RowLabelCell
        label="Notes from Laraib"
        centered
        className="bg-violet-100/90 group-hover:bg-violet-100 dark:bg-violet-950/35 dark:group-hover:bg-violet-950/45"
      />
      {sites.map((s) => (
        <td
          key={s.id}
          className="border-b border-r border-violet-200/70 bg-violet-50/70 p-0 align-top dark:border-violet-900/60 dark:bg-violet-950/20"
        >
          <NotesCell
            site={s}
            label="Notes from Laraib"
            value={s.notes_from_laraib}
            onCommit={(v) => mutation.mutate({ website_id: s.id, field: "notes_from_laraib", value: v })}
          />
        </td>
      ))}
    </tr>
  );

  const importanceRow = () => {
    const m = GROUPS[0].metrics[0]; // Importance score
    return (
      <tr className="group">
        <RowLabelCell label={m.label} />
        {sites.map((s, i) => (
          <td key={s.id} className={`border-b border-r border-border p-0 text-center align-middle ${zebra(i)}`}>
            <EditableCell
              value={m.value(s) ?? null}
              options={m.options!}
              tone={m.tone(s)}
              empty={false}
              onChange={(v) => mutation.mutate({ website_id: s.id, field: m.key, value: v })}
            />
          </td>
        ))}
      </tr>
    );
  };

  const lastCheckRow = () => (
    <tr className="group">
      <RowLabelCell label="Last check" />
      {sites.map((site, index) => (
        <td key={site.id} className="border-b border-r border-border p-0 text-center align-middle">
          <LastCheckCell
            site={site}
            zebraClass={zebra(index)}
            onChange={(value) => mutation.mutate({
              website_id: site.id,
              field: "last_check_status",
              value,
            })}
          />
        </td>
      ))}
    </tr>
  );

  const sectionHeader = (title: string, accent: MetricGroup["accent"] | "info") => (
    <tr key={`hdr-${title}`}>
      <td
        colSpan={sites.length + 1}
        className="bg-sidebar text-sidebar-foreground border-b border-border"
      >
        <button
          type="button"
          onClick={() => toggleSection(title)}
          aria-expanded={!collapsed[title]}
          className="sticky left-0 flex items-center gap-2 px-3 py-2 font-bold uppercase tracking-wider text-[12px] text-sidebar-foreground hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info transition-colors"
        >
          {collapsed[title] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span className={`inline-block w-1 h-4 rounded ${accent === "info" ? "bg-info" : accentBar[accent]}`} />
          {title}
        </button>
      </td>
    </tr>
  );

  return (
    <AppShell title="Websites" hideTitle>
      {apiStatus && !apiStatus.ok && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <div className="font-semibold">Database connection problem</div>
          <div className="mt-1 break-words opacity-90">{apiStatus.message}</div>
        </div>
      )}
      <div className="relative isolate mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224] p-4 text-white shadow-[0_24px_60px_rgba(10,18,36,0.18)] md:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-8rem] left-1/2 h-52 w-80 -translate-x-1/2 rounded-full bg-pink-500/8 blur-3xl" />

        <div className="relative z-10 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_minmax(700px,auto)] lg:items-start">
          <div className="space-y-2">
            <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Websites</h1>
            <div className="mt-1 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.8)]" />
              Portfolio command centre
            </div>
            </div>
            <div className="relative min-w-[240px] lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or URL…"
                className="h-9 w-full rounded-lg border border-white/12 bg-white/[0.06] pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
              />
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
              <Circle className="h-1.5 w-1.5 fill-emerald-300 text-emerald-300" />
              {sites.length} websites
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              <MultiCheckFilter label="Servers" allLabel="All servers" options={SERVER_FILTERS} selected={servers} onChange={setServers} dark minWidth={150} />
              <MultiCheckFilter label="Priorities" allLabel="All priorities" options={PRIORITY_FILTERS} selected={priorities} onChange={setPriorities} dark minWidth={150} />
              <MultiCheckFilter
                label="Type of website"
                allLabel="Type of website"
                options={WORDPRESS_FILTERS}
                selected={wordpressTypes}
                onChange={(values) => setWordpressTypes(values as Array<"wordpress" | "non_wordpress">)}
                dark
                minWidth={176}
              />
              <MultiCheckFilter
                label="Active?"
                allLabel="Active?"
                options={ACTIVITY_FILTERS}
                selected={activities}
                onChange={(values) => setActivities(values as Array<"active" | "inactive">)}
                dark
                minWidth={130}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1 lg:justify-end">
              {categories.map((c) => (
                <button key={c} onClick={() => setCat(c)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${cat === c ? "border-cyan-200 bg-cyan-200 text-[#07101f] shadow-[0_8px_22px_rgba(103,232,249,.16)]" : "border-white/10 bg-white/[0.05] text-white/70 hover:border-white/20 hover:bg-white/[0.09] hover:text-white"}`}>
                  {c === "all" ? "All" : categoryLabel(c)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              {focusedSite && (
                <button
                  type="button"
                  onClick={removeFocusedSite}
                  disabled={websiteDeleteMutation.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300/25 bg-red-500/12 px-3 text-xs font-bold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                  title={`Delete ${focusedSite.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls="websites-grid"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-violet-300/30 bg-gradient-to-r from-purple-800 to-violet-700 px-3 text-xs font-bold text-white shadow-[0_8px_24px_rgba(91,33,182,.32)] transition-all hover:-translate-y-0.5 hover:from-purple-700 hover:to-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60"
                title={expanded ? "Show only the essentials" : "Reveal every field"}
              >
                {expanded ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
                <span>{expanded ? "Compact view" : "Expand all fields"}</span>
                {!expanded && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-black">+{extraFieldCount}</span>}
              </button>
            </div>
            </div>
          </div>
      </div>

      {sites.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">No websites match.</div>
      ) : (
        <div
          id="websites-grid"
          data-column-focus={activeColumn > 1 ? "active" : "inactive"}
          onMouseOver={(event) => {
            const cell = (event.target as HTMLElement).closest("th, td") as HTMLTableCellElement | null;
            setHoveredColumn(cell && cell.cellIndex > 0 ? cell.cellIndex + 1 : -1);
          }}
          onMouseLeave={() => setHoveredColumn(-1)}
          className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
        >
          {activeColumn > 1 && (
            <style>{`
              @media (min-width: 1024px) {
                #websites-grid[data-column-focus="active"] tr > * {
                  transform-origin: center top;
                  transition: transform 180ms ease, box-shadow 180ms ease;
                }
                #websites-grid[data-column-focus="active"] tr > *:nth-child(${activeColumn}) {
                  position: relative;
                  z-index: 15;
                  transform: scale(1.012);
                  box-shadow: 0 7px 18px rgb(2 7 19 / .09);
                }
                #websites-grid[data-column-focus="active"] thead tr > *:nth-child(${activeColumn}) {
                  transform: scale(1.045);
                  box-shadow: 0 12px 26px rgb(2 7 19 / .16);
                  z-index: 40;
                }
              }
            `}</style>
          )}
          <div className="max-h-[calc(100vh-7rem)] overflow-auto">
            <table className="w-max text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 bg-sidebar text-sidebar-foreground text-left px-3 py-3 font-bold text-[13.5px] border-b border-r border-border min-w-[240px] w-[240px]">
                    Field
                  </th>
                  {sites.map((s, index) => (
                      <th
                        key={s.id}
                        id={`website-column-${s.id}`}
                        style={{ background: websiteHeaderBackground(index) }}
                        className="text-sidebar-foreground border-b border-r border-border px-3 py-3 min-w-[190px] w-[190px] align-bottom relative transition-all"
                      >
                        <div className="text-center flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleSiteFocus(s.id)}
                            aria-pressed={focusedSiteId === s.id}
                            aria-label={focusedSiteId === s.id ? `Exit focus mode for ${s.name}` : `Focus ${s.name} column`}
                            title={focusedSiteId === s.id ? "Exit column focus" : "Focus this website column"}
                            className={`absolute right-2 top-2 hidden rounded-md border p-1 transition lg:inline-flex ${
                              focusedSiteId === s.id
                                ? "border-cyan-200/45 bg-cyan-200/20 text-cyan-100"
                                : "border-white/10 bg-white/[0.04] text-white/40 hover:border-white/25 hover:text-white/80"
                            }`}
                          >
                            <Scan className="h-3 w-3" />
                          </button>
                          <div className="flex items-center gap-1.5">
                            <Circle className="w-1.5 h-1.5 fill-success text-success" />
                            <Link to="/websites/$id" params={{ id: s.id }} className="font-bold text-[15px] hover:underline text-sidebar-foreground block truncate max-w-[160px]">
                              {s.name}
                            </Link>
                          </div>
                          <a href={s.url.startsWith("http") ? s.url : `https://${s.url}`}
                             target="_blank" rel="noopener noreferrer"
                             className="text-[10.6px] text-info hover:underline inline-flex items-center gap-1 truncate max-w-[170px]">
                            {cleanUrl(s.url)} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        </div>
                      </th>
                  ))}
                </tr>
              </thead>
              <tbody
                key={expanded ? "expanded" : "compact"}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
              >
                {!expanded ? (
                  <>
                    {sectionHeader("Essentials", "info")}
                    {!collapsed.Essentials && (
                      <>
                        <RevealLoginRow label="WordPress login" kind="wp" sites={sites} zebra={zebra} disabled={!!disabledRows["cred-wp"]} onToggle={() => toggleRow("cred-wp")} />
                        <RevealLoginRow label="Server / cPanel login" kind="cpanel" sites={sites} zebra={zebra} disabled={!!disabledRows["cred-cpanel"]} onToggle={() => toggleRow("cred-cpanel")} />
                        {importanceRow()}
                        {lastCheckRow()}
                        {notesRow()}
                        {laraibNotesRow()}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {sectionHeader("Credentials", "info")}
                    {!collapsed.Credentials && (
                      <>
                        <RevealLoginRow label="WordPress login" kind="wp" sites={sites} zebra={zebra} disabled={!!disabledRows["cred-wp"]} onToggle={() => toggleRow("cred-wp")} />
                        <RevealLoginRow label="Server / cPanel" kind="cpanel" sites={sites} zebra={zebra} disabled={!!disabledRows["cred-cpanel"]} onToggle={() => toggleRow("cred-cpanel")} />
                        <RevealLoginRow label="Gmail login" kind="gmail" sites={sites} zebra={zebra} disabled={!!disabledRows["cred-gmail"]} onToggle={() => toggleRow("cred-gmail")} />
                        <CredentialCollectionRow label="Email logins" mode="email" sites={sites} zebra={zebra} disabled={!!disabledRows["cred-email"]} onToggle={() => toggleRow("cred-email")} />
                        <CredentialCollectionRow label="Social logins" mode="social" sites={sites} zebra={zebra} disabled={!!disabledRows["cred-social"]} onToggle={() => toggleRow("cred-social")} />
                        <CredentialCollectionRow label="Other logins" mode="other" sites={sites} zebra={zebra} disabled={!!disabledRows["cred-other"]} onToggle={() => toggleRow("cred-other")} />
                      </>
                    )}

                    {GROUPS.map((g) => (
                      <Fragment key={g.title}>
                        {sectionHeader(g.title, g.accent)}
                        {!collapsed[g.title] && g.metrics.map((m) => {
                          const rowKey = `${g.title}-${m.key}`;
                          const rowDisabled = !!disabledRows[rowKey];
                          return (
                          <Fragment key={rowKey}>
                          <tr className={`group ${rowDisabled ? "opacity-50" : ""}`}>
                            <RowLabelCell label={m.label} disabled={rowDisabled} onToggle={() => toggleRow(rowKey)} tooltip={m.tooltip} />
                            {sites.map((s, i) => {
                              const tone = m.tone(s);
                              const raw = m.value(s);
                              const empty = tone === "empty" || raw == null || raw === "";
                              const zebraBg = zebra(i);
                              const disabledCls = rowDisabled ? "line-through text-muted-foreground" : "";
                              if (s.status === "inactive" && INACTIVE_NA_METRIC_KEYS.has(m.key)) {
                                return (
                                  <td key={s.id} className={`border-b border-r border-border px-2 py-2 text-center font-bold text-muted-foreground ${zebraBg}`}>
                                    N/A
                                  </td>
                                );
                              }
                              if (!s.uses_wordpress && WORDPRESS_ONLY_METRIC_KEYS.has(m.key)) {
                                return (
                                  <td key={s.id} className={`border-b border-r border-border px-2 py-2 text-center font-bold text-muted-foreground ${zebraBg}`}>
                                    {m.key === "obsolete_plugins" ? "—" : "N/A"}
                                  </td>
                                );
                              }
                              if (m.key === "amazon_links_nofollow" && s.category !== "affiliate") {
                                return <td key={s.id} className={`border-b border-r border-border px-2 py-2 text-center text-muted-foreground/60 ${zebraBg}`}>—</td>;
                              }
                              if (m.key === "last_check") {
                                return (
                                  <td key={s.id} className={`border-b border-r border-border p-0 text-center align-middle ${disabledCls}`}>
                                    <LastCheckCell
                                      site={s}
                                      zebraClass={zebraBg}
                                      onChange={(v) => mutation.mutate({ website_id: s.id, field: "last_check_status", value: v })}
                                    />
                                  </td>
                                );
                              }
                              if (rowDisabled) {
                                return <td key={s.id} className={`border-b border-r border-border px-2 py-2 text-center text-muted-foreground/50 ${zebraBg} line-through`}>{empty ? "—" : (m.key === "category" ? categoryLabel(raw as string) : raw)}</td>;
                              }
                              if (m.editable && m.input === "text") {
                                return (
                                  <td key={s.id} className={`border-b border-r border-border p-0 text-center align-middle ${empty ? zebraBg : ""} ${disabledCls}`}>
                                    <TextCell
                                      value={raw ?? null}
                                      tone={tone}
                                      empty={empty}
                                      onCommit={(v) => mutation.mutate({ website_id: s.id, field: m.key, value: v })}
                                    />
                                  </td>
                                );
                              }
                              if (m.editable && m.options) {
                                const options = m.optionKey
                                  ? (managedOptions[m.optionKey] ?? [...m.options])
                                  : m.options;
                                return (
                                  <td key={s.id} className={`border-b border-r border-border p-0 text-center align-middle ${empty ? zebraBg : ""} ${disabledCls}`}>
                                    <EditableCell
                                      value={raw ?? null}
                                      options={options}
                                      tone={tone}
                                      empty={empty}
                                      onChange={(v) => mutation.mutate({ website_id: s.id, field: m.key, value: v })}
                                      format={m.key === "category" ? categoryLabel : undefined}
                                      emptyLabel={m.key === "server_label" ? "Unassigned" : m.key === "ppc_enabled" ? "No PPC" : undefined}
                                      allowEmpty={m.key !== "wordpress_version" && m.key !== "obsolete_plugins"}
                                      onAddOption={m.optionKey ? (option) => addOption(m.optionKey!, option) : undefined}
                                      onRemoveOption={m.optionKey ? (option) => removeOption(m.optionKey!, option) : undefined}
                                      detail={m.key === "obsolete_plugins" ? s.obsolete_plugins_other : undefined}
                                      onDetailCommit={m.key === "obsolete_plugins"
                                        ? (detail) => mutation.mutate({ website_id: s.id, field: "obsolete_plugins_other", value: detail })
                                        : undefined}
                                    />
                                  </td>
                                );
                              }
                              return (
                                <td key={s.id} className={`border-b border-r border-border px-2 py-2 text-center align-middle ${empty ? zebraBg : toneClass[tone]} ${disabledCls}`}>
                                  {empty ? <span className="text-muted-foreground/60">—</span> : <span className="text-[11px] font-medium">{raw}</span>}
                                </td>
                              );
                            })}
                          </tr>
                          {g.title === "Overview" && m.key === "importance_score" && (
                            <>
                              {notesRow()}
                              {laraibNotesRow()}
                            </>
                          )}
                          </Fragment>
                          );
                        })}
                      </Fragment>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section
        aria-label="Highest priorities"
        className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224] px-4 py-3 text-white shadow-[0_16px_42px_rgba(10,18,36,0.14)]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex min-h-12 flex-wrap items-center gap-x-5 gap-y-2">
          <div className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Highest priorities
          </div>
          {prioritySite ? (
            <>
              <div
                key={`${prioritySite.id}-${priorityIndex}`}
                className="min-w-0 flex-1 text-[12px] leading-relaxed text-white/78 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-bold [&_ul]:list-disc"
              >
                <span>{priorityNoteText}</span>
                <span className="text-white/50"> - </span>
                <strong className="font-semibold text-white">{prioritySite.name}</strong>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-lg border border-cyan-200/25 bg-cyan-200/10 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100">
                  Priority {prioritySite.importance_score}
                </span>
                {prioritySites.length > 1 && (
                  <div className="flex gap-1" aria-label={`${priorityIndex + 1} of ${prioritySites.length}`}>
                    {prioritySites.map((site, index) => (
                      <span
                        key={site.id}
                        className={`h-1.5 rounded-full transition-all ${
                          index === priorityIndex % prioritySites.length ? "w-4 bg-cyan-200" : "w-1.5 bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-white/50">No priority notes in this view.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
