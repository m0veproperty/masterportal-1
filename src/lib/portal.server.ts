// Server-only helpers. Never imported by client-reachable modules directly.
import { apiDb } from "./api-db.server";

export function admin() {
  return apiDb;
}

export function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .trim();
}

export async function logAudit(entry: {
  action: string;
  website_id?: string | null;
  credential_id?: string | null;
  summary?: string;
  meta?: Record<string, unknown>;
}) {
  const { error } = await admin()
    .from("audit_log")
    .insert({
      action: entry.action,
      website_id: entry.website_id ?? null,
      credential_id: entry.credential_id ?? null,
      summary: entry.summary ?? null,
      meta: entry.meta ?? {},
    });
  if (error) throw error;
}

/** Maintenance freshness color based on days since last check. */
export function freshnessBand(
  checkedAt: string | null,
  answer: string | null,
  cadence: "monthly" | "quarterly",
): "green" | "amber" | "orange" | "red" | "grey" {
  if (answer && /^no$/i.test(answer)) return "red";
  if (!checkedAt) {
    if (answer && /unsure/i.test(answer)) return "grey";
    return "grey";
  }
  const days = Math.floor(
    (Date.now() - new Date(checkedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (cadence === "monthly") {
    if (days <= 30) return "green";
    if (days <= 45) return "amber";
    if (days <= 60) return "orange";
    return "red";
  }
  if (days <= 90) return "green";
  if (days <= 105) return "amber";
  if (days <= 120) return "orange";
  return "red";
}

const CRITICAL_FIELDS: Array<[string, (v: string | null) => boolean]> = [
  ["security_plugin", (v) => !!v && /^yes/i.test(v)],
  ["firewall", (v) => !!v && /^yes/i.test(v)],
  ["captcha_protection", (v) => !!v && (/^yes/i.test(v) || /some/i.test(v))],
  ["xml_rpc_disabled", (v) => !!v && /^yes/i.test(v)],
];

export type HealthStatus =
  | "healthy"
  | "mostly_healthy"
  | "needs_attention"
  | "high_risk"
  | "incomplete";

export function healthFor(w: Record<string, unknown>): {
  status: HealthStatus;
  issues: string[];
} {
  const issues: string[] = [];
  let criticalFail = 0;
  let unsureCount = 0;

  for (const [key, ok] of CRITICAL_FIELDS) {
    const v = (w[key] ?? null) as string | null;
    if (!v) {
      issues.push(`${labelize(key)} not recorded`);
      unsureCount++;
    } else if (/unsure/i.test(v)) {
      issues.push(`${labelize(key)} unsure`);
      unsureCount++;
    } else if (!ok(v)) {
      issues.push(`${labelize(key)} failing`);
      criticalFail++;
    }
  }

  const themeBand = freshnessBand(
    (w.theme_plugins_checked_at ?? null) as string | null,
    (w.theme_plugins_status ?? null) as string | null,
    "monthly",
  );
  const obsoleteBand = freshnessBand(
    (w.obsolete_plugins_checked_at ?? null) as string | null,
    (w.obsolete_plugins ?? null) as string | null,
    "quarterly",
  );
  if (themeBand === "red") { criticalFail++; issues.push("Monthly theme/plugin check overdue"); }
  else if (themeBand === "orange") issues.push("Monthly check nearly overdue");
  if (obsoleteBand === "red") { criticalFail++; issues.push("Quarterly plugin cleanup overdue"); }

  const php = (w.php_version ?? "") as string;
  if (php && /^([0-6]|7)\./.test(php)) { criticalFail++; issues.push(`Old PHP (${php})`); }

  let status: HealthStatus = "healthy";
  if (criticalFail >= 2) status = "high_risk";
  else if (criticalFail === 1) status = "needs_attention";
  else if (unsureCount >= 3) status = "incomplete";
  else if (unsureCount >= 1) status = "mostly_healthy";
  return { status, issues };
}

function labelize(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
