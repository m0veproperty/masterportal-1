import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUnlocked } from "./gate.server";
import {
  WEBSITE_FIELD_OPTION_DEFAULTS,
  WEBSITE_FIELD_OPTION_KEYS,
  type WebsiteFieldOptionKey,
} from "./website-options";

async function db() {
  const { admin } = await import("./portal.server");
  return admin();
}

export const getApiStatus = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { diagnoseApi } = await import("./api-db.server");
  return diagnoseApi();
});

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { admin } = await import("./portal.server");
  const sb = admin();

  const [{ data: websites }, { data: audit }, { count: premiumDomainsCount }] = await Promise.all([
    sb.from("websites").select("id,name,url,category,server_label,importance_score,uses_wordpress,updated_at,status").neq("status", "archived"),
    sb.from("audit_log").select("id,action,summary,created_at,website_id").order("created_at", { ascending: false }).limit(30),
    sb.from("premium_domains").select("id", { count: "exact", head: true }).eq("active", true),
  ]);

  const list = websites ?? [];
  type DashboardSite = {
    id: string;
    name: string;
    url: string;
    category: string | null;
    server_label: string | null;
    importance_score: number;
  };
  const toDashboardSite = (website: typeof list[number]): DashboardSite => ({
    id: website.id,
    name: website.name,
    url: website.url,
    category: website.category,
    server_label: website.server_label,
    importance_score: website.importance_score ?? 5,
  });
  const byCategory: Record<string, { count: number; sites: DashboardSite[] }> = {};
  for (const w of list) {
    const key = w.category ?? "other";
    if (!byCategory[key]) byCategory[key] = { count: 0, sites: [] };
    byCategory[key].count++;
    byCategory[key].sites.push(toDashboardSite(w));
  }
  for (const k of Object.keys(byCategory)) {
    byCategory[k].sites.sort((a, b) => a.name.localeCompare(b.name));
  }
  const wordpressSites = list
    .filter((w) => w.uses_wordpress)
    .map(toDashboardSite)
    .sort((a, b) => b.importance_score - a.importance_score || a.name.localeCompare(b.name));

  const siteById = new Map(list.map((w) => [w.id, w] as const));

  // Merge site updates + audit activity into one feed
  const updateEvents = list.map((w) => ({
    id: `upd-${w.id}`,
    kind: "update" as const,
    when: w.updated_at,
    website_id: w.id,
    website_name: w.name,
    summary: `${w.name} record updated`,
  }));
  const auditEvents = (audit ?? []).map((a) => {
    const site = a.website_id ? siteById.get(a.website_id) : undefined;
    return {
      id: `aud-${a.id}`,
      kind: "activity" as const,
      when: a.created_at,
      website_id: a.website_id,
      website_name: site?.name ?? null,
      summary: a.summary ?? a.action,
    };
  });
  const feed = [...updateEvents, ...auditEvents]
    .sort((a, b) => +new Date(b.when) - +new Date(a.when))
    .slice(0, 15);

  return {
    total: list.length,
    byCategory,
    wordpress: {
      count: wordpressSites.length,
      sites: wordpressSites,
    },
    premiumDomains: {
      count: premiumDomainsCount ?? 0,
    },
    feed,
    generatedAt: Date.now(),
  };
});

export const listWebsites = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    servers: z.array(z.string()).optional(),
    priorities: z.array(z.string()).optional(),
    wordpressTypes: z.array(z.enum(["wordpress", "non_wordpress"])).optional(),
    activities: z.array(z.enum(["active", "inactive"])).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, healthFor, freshnessBand } = await import("./portal.server");
    const sb = admin();
    let q = sb.from("websites").select("*").order("importance_score", { ascending: false }).order("name");
    if (data.category && data.category !== "all") q = q.eq("category", data.category as never);
    const { data: rows } = await q;
    let list = rows ?? [];
    if (data.servers) {
      const defaultServers = ["ny2.wiwy.com", "ny1.wiwy.com", "da.wiwy.com", "External Server"];
      const allDefaultServersSelected =
        data.servers.length === defaultServers.length
        && defaultServers.every((server) => data.servers!.includes(server));

      // The default UI selection means "all servers". Do not turn that into
      // a database value allowlist because imported MariaDB rows may contain a
      // blank, new, or previously unseen server_label. Only filter when the
      // user has deliberately narrowed the server selection.
      if (!allDefaultServersSelected) {
        list = data.servers.length === 0
          ? []
          : list.filter((row) => data.servers!.includes(row.server_label ?? ""));
      }
    }
    if (data.priorities) {
      list = list.filter((row) => {
        const score = row.importance_score ?? 5;
        const band = score >= 9 ? "very_high" : score >= 7 ? "high" : score >= 4 ? "mid" : "low";
        return data.priorities!.includes(band);
      });
    }
    if (data.wordpressTypes) {
      list = list.filter((row) =>
        data.wordpressTypes!.includes(row.uses_wordpress ? "wordpress" : "non_wordpress"),
      );
    }
    if (data.activities) {
      list = list.filter((row) => data.activities!.includes(row.status === "inactive" ? "inactive" : "active"));
    }
    if (data.q) {
      const needle = data.q.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(needle) || r.url.toLowerCase().includes(needle));
    }

    // Fetch WordPress / Gmail / cPanel credentials for the whole set
    const ids = list.map((w) => w.id);
    const { data: creds } = ids.length
      ? await sb.from("credentials")
          .select("id, website_id, kind, label, login_url, username, notes, extra")
          .in("website_id", ids)
      : { data: [] as Array<{
          id: string;
          website_id: string | null;
          kind: string;
          label: string | null;
          login_url: string | null;
          username: string | null;
          notes: string | null;
          extra: unknown;
        }> };
    type ListedCredential = {
      id: string;
      kind: string;
      login_url: string | null;
      username: string | null;
      label: string | null;
      notes: string | null;
      extra: Record<string, unknown>;
    };
    const credsBySite = new Map<string, {
      singles: Record<string, ListedCredential>;
      emails: ListedCredential[];
      socials: ListedCredential[];
      others: ListedCredential[];
    }>();
    for (const c of creds ?? []) {
      if (!c.website_id) continue;
      const bucket = credsBySite.get(c.website_id) ?? { singles: {}, emails: [], socials: [], others: [] };
      const listed = {
        id: c.id,
        kind: c.kind,
        login_url: c.login_url,
        username: c.username,
        label: c.label,
        notes: c.notes,
        extra: (c.extra ?? {}) as Record<string, unknown>,
      };
      const verified = listed.extra.verified === true || listed.extra.source === "user_supplied";
      if (c.kind === "cpanel" || (["wordpress", "gmail"].includes(c.kind) && verified)) {
        bucket.singles[c.kind] = listed;
      } else if (
        c.kind === "other"
        && (c.label === "Email login" || listed.extra.credential_type === "email_login")
        && verified
      ) {
        bucket.emails.push(listed);
      } else if (
        c.kind === "other"
        && listed.extra.credential_type === "other_login"
        && verified
      ) {
        bucket.others.push(listed);
      } else if (["facebook", "twitter", "pinterest", "instagram"].includes(c.kind) && verified) {
        bucket.socials.push(listed);
      }
      credsBySite.set(c.website_id, bucket);
    }

    return list.map((w) => {
      const h = healthFor(w);
      const extra = (w.extra_fields ?? {}) as Record<string, string>;
      const siteCreds = credsBySite.get(w.id) ?? { singles: {}, emails: [], socials: [], others: [] };
      const checkCandidates = [
        w.last_reviewed_date,
        w.theme_plugins_checked_at,
        w.obsolete_plugins_checked_at,
        w.search_console_checked_at,
      ].filter(Boolean) as string[];
      const last_check = checkCandidates.length
        ? checkCandidates.sort().slice(-1)[0]
        : null;
      return {
        id: w.id,
        name: w.name,
        url: w.url,
        category: w.category,
        importance: w.importance,
        importance_score: w.importance_score ?? 5,
        status: w.status,
        active_status: w.status === "inactive" ? "Not active" : "Active",
        last_reviewed_date: w.last_reviewed_date,
        last_check_status: w.last_check_status,
        next_review_date: w.next_review_date,
        last_check,
        notes: w.notes ?? null,
        notes_from_laraib: w.notes_from_laraib ?? null,
        ppc_enabled: w.ppc_enabled,
        health: h.status,
        issues_count: h.issues.length,
        monthly_band: freshnessBand(w.theme_plugins_checked_at, w.theme_plugins_status, "monthly"),
        quarterly_band: freshnessBand(w.obsolete_plugins_checked_at, w.obsolete_plugins, "quarterly"),
        // Monitoring metrics
        wordpress_version: w.wordpress_version,
        wp_users: w.wp_users,
        wordpress_auto_updates: w.wordpress_auto_updates,
        php_version: w.php_version,
        xml_rpc_disabled: w.xml_rpc_disabled,
        security_plugin: w.security_plugin,
        firewall: w.firewall,
        captcha_protection: w.captcha_protection,
        comments_pings: w.comments_pings,
        gdpr_banner: w.gdpr_banner,
        external_link_security: w.external_link_security,
        image_compression: w.image_compression,
        caching_plugin: w.caching_plugin,
        seo_plugin: w.seo_plugin,
        publish_dates_removed: w.publish_dates_removed,
        misc_links_nofollow: w.misc_links_nofollow,
        social_links_nofollow: w.social_links_nofollow,
        amazon_links_nofollow: w.amazon_links_nofollow,
        obsolete_plugins: w.obsolete_plugins,
        obsolete_plugins_other: w.obsolete_plugins_other,
        theme_plugins_status: w.theme_plugins_status,
        search_console_status: w.search_console_status,
        hosting_provider: w.hosting_provider,
        server_label: w.server_label,
        uses_wordpress: w.uses_wordpress,
        gmail_access_state: extra["Gmail Login State"] ?? "required",
        social_access_state: extra["Social Login State"] ?? "required",
        cpanel_access_state:
          extra["cPanel Login State"]
          ?? (w.status === "inactive"
            ? "not_applicable"
            : w.server_label === "External Server" ? "not_given" : "available"),
        latest_theme: extra["Latest Theme"] ?? extra["latest theme"] ?? null,
        uptime_robot: extra["Uptime Robot?"] ?? extra["Uptime Robot"] ?? null,
        custom_wp_plugins: extra["Custom WP Plugins"] ?? null,
        media_url_permalink:
          extra["Media URL Permalink"]
          ?? (w.uses_wordpress ? "Disabled" : "N/A"),
        // Grouped credentials (id + non-sensitive metadata)
        wp_credential: siteCreds.singles.wordpress ?? null,
        gmail_credential: siteCreds.singles.gmail ?? null,
        cpanel_credential: siteCreds.singles.cpanel ?? null,
        email_credentials: siteCreds.emails,
        social_credentials: siteCreds.socials,
        other_credentials: siteCreds.others,
      };
    });
  });


const UPDATABLE_COLUMNS = new Set([
  "importance_score", "wp_users", "category", "notes", "notes_from_laraib",
  "wordpress_version", "wordpress_auto_updates", "php_version",
  "security_plugin", "firewall", "captcha_protection", "xml_rpc_disabled",
  "comments_pings", "gdpr_banner", "external_link_security",
  "caching_plugin", "image_compression",
  "seo_plugin", "publish_dates_removed",
  "misc_links_nofollow", "social_links_nofollow", "amazon_links_nofollow",
  "obsolete_plugins", "obsolete_plugins_other", "theme_plugins_status", "search_console_status",
  "ppc_enabled", "hosting_provider", "server_label",
]);

const VALID_CATEGORIES = new Set([
  "affiliate", "adsense_other", "dropship", "pbn", "portfolio", "client", "premium", "other",
]);
const VALID_LAST_CHECK_STATUSES = new Set([
  "today", "unknown", "laraib_to_check", "pending",
]);
const UPDATABLE_EXTRA = new Set([
  "latest_theme", "uptime_robot", "custom_wp_plugins",
  "gmail_access_state", "social_access_state", "cpanel_access_state",
]);
const EXTRA_KEY_MAP: Record<string, string> = {
  latest_theme: "Latest Theme",
  uptime_robot: "Uptime Robot?",
  custom_wp_plugins: "Custom WP Plugins",
  gmail_access_state: "Gmail Login State",
  social_access_state: "Social Login State",
  cpanel_access_state: "cPanel Login State",
};
const VALID_ACCESS_STATES: Record<string, Set<string>> = {
  gmail_access_state: new Set(["required", "not_required"]),
  social_access_state: new Set(["required", "not_required"]),
  cpanel_access_state: new Set(["available", "not_given", "not_applicable"]),
};
const WORDPRESS_ONLY_COLUMNS = [
  "obsolete_plugins",
  "wordpress_version",
  "wp_users",
  "wordpress_auto_updates",
  "security_plugin",
  "firewall",
  "xml_rpc_disabled",
  "comments_pings",
  "seo_plugin",
] as const;

const INACTIVE_NA_COLUMNS = [
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
] as const;


export const updateWebsiteField = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      website_id: z.string().uuid(),
      field: z.string().min(1).max(80),
      value: z.union([z.string(), z.number(), z.null()]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    if (data.field === "importance_score") {
      const n = Number(data.value);
      if (!Number.isFinite(n) || n < 1 || n > 10) throw new Error("Score must be 1-10");
      await sb.from("websites").update({ importance_score: Math.round(n) } as never).eq("id", data.website_id);
    } else if (data.field === "category") {
      const v = String(data.value ?? "");
      if (!VALID_CATEGORIES.has(v)) throw new Error(`Invalid category '${v}'`);
      await sb.from("websites").update({ category: v } as never).eq("id", data.website_id);
    } else if (data.field === "last_check_status") {
      const v = data.value == null || data.value === "" ? null : String(data.value);
      if (v !== null && !VALID_LAST_CHECK_STATUSES.has(v)) {
        throw new Error(`Invalid last check status '${v}'`);
      }
      const patch: { last_check_status: string | null; last_reviewed_date?: string } = {
        last_check_status: v,
      };
      if (v === "today") patch.last_reviewed_date = new Date().toISOString().slice(0, 10);
      await sb.from("websites").update(patch as never).eq("id", data.website_id);
    } else if (data.field === "active_status") {
      const nextStatus = data.value === "Not active" ? "inactive" : data.value === "Active" ? "active" : null;
      if (!nextStatus) throw new Error(`Invalid active status '${data.value}'`);
      const { data: current } = await sb
        .from("websites")
        .select(`extra_fields, server_label, ${INACTIVE_NA_COLUMNS.join(", ")}`)
        .eq("id", data.website_id)
        .maybeSingle();
      const patch: Record<string, string | null | Record<string, unknown>> = {
        status: nextStatus,
      };
      const extra = { ...((current?.extra_fields ?? {}) as Record<string, unknown>) };
      if (nextStatus === "inactive") {
        for (const field of INACTIVE_NA_COLUMNS) patch[field] = "N/A";
        extra["cPanel Login State"] = "not_applicable";
      } else {
        for (const field of INACTIVE_NA_COLUMNS) {
          if (current?.[field] === "N/A") patch[field] = null;
        }
        if (extra["cPanel Login State"] === "not_applicable") {
          extra["cPanel Login State"] = current?.server_label === "External Server" ? "not_given" : "available";
        }
      }
      patch.extra_fields = extra;
      await sb.from("websites").update(patch as never).eq("id", data.website_id);
    } else if (data.field === "uses_wordpress") {
      const value = data.value === "true";
      const { data: current } = await sb
        .from("websites")
        .select(`extra_fields, ${WORDPRESS_ONLY_COLUMNS.join(", ")}`)
        .eq("id", data.website_id)
        .maybeSingle();
      const patch: Record<string, string | boolean | null | Record<string, unknown>> = {
        uses_wordpress: value,
      };
      const extra = { ...((current?.extra_fields ?? {}) as Record<string, unknown>) };
      if (!value) {
        for (const field of WORDPRESS_ONLY_COLUMNS) patch[field] = "N/A";
        extra["Latest Theme"] = "N/A";
        extra["Custom WP Plugins"] = "N/A";
      } else {
        for (const field of WORDPRESS_ONLY_COLUMNS) {
          if (current?.[field] === "N/A") patch[field] = null;
        }
        if (extra["Latest Theme"] === "N/A") extra["Latest Theme"] = null;
        if (extra["Custom WP Plugins"] === "N/A") extra["Custom WP Plugins"] = "None";
      }
      patch.extra_fields = extra;
      await sb.from("websites").update(patch as never).eq("id", data.website_id);
    } else if (UPDATABLE_COLUMNS.has(data.field)) {

      const v = data.value === "" || data.value == null ? null : String(data.value);
      await sb.from("websites").update({ [data.field]: v } as never).eq("id", data.website_id);
    } else if (UPDATABLE_EXTRA.has(data.field)) {
      const allowed = VALID_ACCESS_STATES[data.field];
      const nextValue = data.value == null || data.value === "" ? null : String(data.value);
      if (allowed && nextValue !== null && !allowed.has(nextValue)) {
        throw new Error(`Invalid access state '${nextValue}'`);
      }
      const { data: row } = await sb.from("websites").select("extra_fields").eq("id", data.website_id).maybeSingle();
      const extra = { ...((row?.extra_fields ?? {}) as Record<string, string>) };
      const key = EXTRA_KEY_MAP[data.field];
      if (nextValue === null) delete extra[key];
      else extra[key] = nextValue;
      await sb.from("websites").update({ extra_fields: extra } as never).eq("id", data.website_id);
    } else {
      throw new Error(`Field '${data.field}' is not editable`);
    }
    await logAudit({
      action: "website_field_updated",
      website_id: data.website_id,
      summary: `Updated ${data.field} → ${data.value ?? "—"}`,
    });
    return { ok: true };
  });

const WEBSITE_OPTIONS_SETTINGS_KEY = "website_field_options";

function normaliseWebsiteOptions(value: unknown) {
  const saved = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return Object.fromEntries(
    WEBSITE_FIELD_OPTION_KEYS.map((key) => {
      const candidate = saved[key];
      const options = Array.isArray(candidate)
        ? candidate
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : WEBSITE_FIELD_OPTION_DEFAULTS[key];
      return [key, [...new Set(options)]];
    }),
  ) as Record<WebsiteFieldOptionKey, string[]>;
}

export const getWebsiteFieldOptions = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const sb = await db();
  const { data } = await sb
    .from("app_settings")
    .select("value")
    .eq("key", WEBSITE_OPTIONS_SETTINGS_KEY)
    .maybeSingle();
  return normaliseWebsiteOptions(data?.value);
});

export const updateWebsiteFieldOption = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      field: z.enum(WEBSITE_FIELD_OPTION_KEYS as [WebsiteFieldOptionKey, ...WebsiteFieldOptionKey[]]),
      action: z.enum(["add", "remove"]),
      option: z.string().trim().min(1).max(80),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const { data: currentRow } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", WEBSITE_OPTIONS_SETTINGS_KEY)
      .maybeSingle();
    const options = normaliseWebsiteOptions(currentRow?.value);
    const current = options[data.field];
    options[data.field] = data.action === "add"
      ? [...new Set([...current, data.option])]
      : current.filter((option) => option !== data.option);
    await sb.from("app_settings").upsert({
      key: WEBSITE_OPTIONS_SETTINGS_KEY,
      value: options,
      updated_at: new Date().toISOString(),
    } as never);
    await logAudit({
      action: "website_field_options_updated",
      summary: `${data.action === "add" ? "Added" : "Removed"} '${data.option}' ${data.action === "add" ? "to" : "from"} ${data.field}`,
    });
    return options;
  });

export const updateCredentialField = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      website_id: z.string().uuid().optional(),
      kind: z.enum(["wordpress", "gmail", "cpanel", "facebook", "twitter", "pinterest", "instagram", "other"]).optional(),
      label: z.string().max(120).nullable().optional(),
      notes: z.string().max(500).nullable().optional(),
      login_url: z.string().max(500).nullable().optional(),
      username: z.string().max(200).nullable().optional(),
      password: z.string().max(300).optional(),
      credential_type: z.enum(["email_login", "other_login"]).optional(),
    }).superRefine((value, context) => {
      if (!value.id && (!value.website_id || !value.kind)) {
        context.addIssue({
          code: "custom",
          message: "A website and credential type are required for a new login",
        });
      }
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const patch: Record<string, unknown> = {};
    if (data.id && data.kind !== undefined) patch.kind = data.kind;
    if (data.login_url !== undefined) patch.login_url = data.login_url || null;
    if (data.username !== undefined) patch.username = data.username || null;
    if (data.label !== undefined) patch.label = data.label || null;
    if (data.notes !== undefined) patch.notes = data.notes || null;
    if (data.password !== undefined && data.password !== "") {
      const { data: encrypted, error } = await sb.rpc("enc_credential_secure", {
        plaintext: data.password,
      });
      if (error) throw error;
      patch.password_encrypted = encrypted;
    }

    let row: { id: string; website_id: string | null; kind: string } | null = null;
    if (data.id) {
      if (Object.keys(patch).length === 0) return { ok: true, id: data.id };
      const result = await sb
        .from("credentials")
        .update(patch as never)
        .eq("id", data.id)
        .select("id, website_id, kind")
        .maybeSingle();
      if (result.error) throw result.error;
      row = result.data;
    } else {
      const labels = {
        wordpress: "WordPress admin",
        gmail: "Associated Gmail",
        cpanel: "Server (cPanel)",
        facebook: "Facebook",
        twitter: "Twitter",
        pinterest: "Pinterest",
        instagram: "Instagram",
        other: data.credential_type === "other_login" ? "Other login" : "Email login",
      } as const;
      const result = await sb
        .from("credentials")
        .insert({
          website_id: data.website_id!,
          kind: data.kind!,
          label: data.label || labels[data.kind!],
          extra: {
            verified: true,
            source: "portal",
            ...(data.kind === "other"
              ? { credential_type: data.credential_type ?? "email_login" }
              : {}),
          },
          ...patch,
        } as never)
        .select("id, website_id, kind")
        .single();
      if (result.error) throw result.error;
      row = result.data;
    }
    await logAudit({
      action: "credential_field_updated",
      website_id: row?.website_id ?? null,
      credential_id: row?.id ?? null,
      summary: `${data.id ? "Updated" : "Added"} ${row?.kind ?? "credential"} login`,
    });
    return { ok: true, id: row?.id };
  });

export const deleteCredential = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const { data: row } = await sb
      .from("credentials")
      .select("id, website_id, kind, label")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Credential not found");
    const { error } = await sb.from("credentials").delete().eq("id", data.id);
    if (error) throw error;
    await logAudit({
      action: "credential_deleted",
      website_id: row.website_id,
      summary: `Deleted ${row.label || row.kind} credential`,
    });
    return { ok: true };
  });

export const deleteWebsite = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const { data: row } = await sb
      .from("websites")
      .select("id, name, url")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Website not found");
    const { error } = await sb.from("websites").delete().eq("id", data.id);
    if (error) throw error;
    await logAudit({
      action: "website_deleted",
      summary: `Deleted website ${row.name} (${row.url})`,
      meta: { deleted_website_id: row.id },
    });
    return { ok: true };
  });




export const getWebsite = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, healthFor } = await import("./portal.server");
    const sb = admin();
    const [{ data: website }, { data: creds }, { data: audit }] = await Promise.all([
      sb.from("websites").select("*").eq("id", data.id).maybeSingle(),
      sb.from("credentials").select("id, kind, label, login_url, username, phone, recovery_email, two_factor, notes, extra").eq("website_id", data.id).order("kind"),
      sb.from("audit_log").select("id, action, summary, created_at, meta").eq("website_id", data.id).order("created_at", { ascending: false }).limit(40),
    ]);
    if (!website) throw new Error("Website not found");
    const visibleCredentials = (creds ?? []).filter((credential) => {
      const extra = (credential.extra ?? {}) as Record<string, unknown>;
      const verified = extra.verified === true || extra.source === "user_supplied";
      if (credential.kind === "cpanel" || credential.kind === "hosting") return true;
      if (["wordpress", "gmail", "facebook", "twitter", "pinterest", "instagram"].includes(credential.kind)) {
        return verified;
      }
      if (
        credential.kind === "other"
        && (
          credential.label === "Email login"
          || extra.credential_type === "email_login"
          || extra.credential_type === "other_login"
        )
      ) {
        return verified;
      }
      if (credential.kind === "other") return false;
      return true;
    });
    return { website, credentials: visibleCredentials, activity: audit ?? [], health: healthFor(website) };
  });

export const revealCredential = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const { data: row } = await sb
      .from("credentials")
      .select("id, website_id, kind, label, notes, password_encrypted")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    await logAudit({
      action: "credential_revealed",
      website_id: row.website_id,
      credential_id: row.id,
      summary: `Revealed ${row.kind}${row.label ? ` (${row.label})` : ""} password`,
    });
    let password = /placeholder/i.test(row.notes ?? "")
      ? `Vault-${row.id.slice(0, 8)}!`
      : "Not given";
    if (row.password_encrypted) {
      const { data: decrypted, error } = await sb.rpc("dec_credential_secure", {
        ciphertext: row.password_encrypted,
      });
      if (error) throw error;
      if (decrypted) password = decrypted;
    }
    return { password };
  });

export const revealGeneralCredential = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), field: z.enum(["password", "backup"]).default("password") }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const { data: row } = await sb
      .from("general_credentials")
      .select("id, site")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    await logAudit({
      action: "general_credential_revealed",
      summary: `Revealed ${row.site} ${data.field}`,
    });
    return { password: "FakePassword123!" };
  });

export const logCopy = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      credential_id: z.string().uuid().optional(),
      website_id: z.string().uuid().optional(),
      label: z.string().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { logAudit } = await import("./portal.server");
    await logAudit({
      action: "credential_copied",
      website_id: data.website_id ?? null,
      credential_id: data.credential_id ?? null,
      summary: `Copied ${data.label ?? "password"} to clipboard`,
    });
    return { ok: true };
  });

export const listGeneralCredentials = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const sb = await db();
  const { data } = await sb
    .from("general_credentials")
    .select("id, section, site, url, username, backup_username, notes")
    .order("section")
    .order("site");
  return data ?? [];
});

export const listPremium = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const sb = await db();
  const { data } = await sb
    .from("premium_domains")
    .select("id,name,url,active,cpanel_login_url,cpanel_username,cpanel_access_state,cpanel_password_encrypted")
    .order("name");
  return (data ?? []).map((domain) => ({
    id: domain.id,
    name: domain.name,
    url: domain.url,
    active: domain.active,
    cpanel_login_url: domain.cpanel_login_url,
    cpanel_username: domain.cpanel_username,
    cpanel_access_state: domain.cpanel_access_state,
    has_cpanel_password: Boolean(domain.cpanel_password_encrypted),
  }));
});

export const updatePremiumDomain = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      field: z.enum([
        "active",
        "cpanel_access_state",
        "cpanel_login_url",
        "cpanel_username",
        "cpanel_password",
      ]),
      value: z.union([z.string(), z.boolean(), z.null()]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const { data: current } = await sb
      .from("premium_domains")
      .select("name, active, cpanel_access_state")
      .eq("id", data.id)
      .maybeSingle();
    if (!current) throw new Error("Premium domain not found");

    const patch: Record<string, unknown> = {};
    if (data.field === "active") {
      const active = data.value === true || data.value === "true";
      patch.active = active;
      patch.cpanel_access_state = active
        ? current.cpanel_access_state === "not_applicable" ? "not_given" : current.cpanel_access_state
        : "not_applicable";
    } else if (data.field === "cpanel_access_state") {
      const state = String(data.value ?? "");
      if (!["available", "not_given", "not_applicable"].includes(state)) {
        throw new Error(`Invalid cPanel access state '${state}'`);
      }
      patch.cpanel_access_state = state;
    } else if (data.field === "cpanel_password") {
      const password = String(data.value ?? "");
      if (password) {
        const { data: encrypted, error } = await sb.rpc("enc_credential_secure", {
          plaintext: password,
        });
        if (error) throw error;
        patch.cpanel_password_encrypted = encrypted;
      }
    } else {
      patch[data.field] = data.value === "" ? null : data.value;
    }

    const { error } = await sb.from("premium_domains").update(patch as never).eq("id", data.id);
    if (error) throw error;
    await logAudit({
      action: "premium_domain_updated",
      summary: `Updated ${current.name} ${data.field.replaceAll("_", " ")}`,
    });
    return { ok: true };
  });

export const revealPremiumDomainCpanelPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const { data: row } = await sb
      .from("premium_domains")
      .select("name, cpanel_password_encrypted")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Premium domain not found");
    if (!row.cpanel_password_encrypted) return { password: "Not given" };
    const { data: decrypted, error } = await sb.rpc("dec_credential_secure", {
      ciphertext: row.cpanel_password_encrypted,
    });
    if (error) throw error;
    await logAudit({
      action: "premium_domain_credential_revealed",
      summary: `Revealed ${row.name} cPanel password`,
    });
    return { password: decrypted || "Not given" };
  });

export const listSpreadsheets = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const sb = await db();
  const { data } = await sb.from("spreadsheets").select("*").order("name");
  return data ?? [];
});

export const listAudit = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const sb = await db();
  const { data } = await sb
    .from("audit_log")
    .select("id, action, summary, website_id, created_at, meta")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
});

export const listReminders = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const sb = await db();
  const [{ data: websites }, { data: reminders }] = await Promise.all([
    sb.from("websites").select("id, name, category, theme_plugins_checked_at, theme_plugins_status, obsolete_plugins_checked_at, obsolete_plugins, search_console_checked_at, search_console_status").neq("status", "archived"),
    sb.from("reminders").select("*").order("due_date"),
  ]);
  const { freshnessBand } = await import("./portal.server");
  const derived: Array<{
    website_id: string;
    website_name: string;
    kind: string;
    label: string;
    band: string;
    checked_at: string | null;
    cadence_days: number;
  }> = [];
  for (const w of websites ?? []) {
    derived.push({
      website_id: w.id, website_name: w.name, kind: "theme_plugins", label: "Theme & plugins (monthly)",
      band: freshnessBand(w.theme_plugins_checked_at, w.theme_plugins_status, "monthly"),
      checked_at: w.theme_plugins_checked_at, cadence_days: 30,
    });
    derived.push({
      website_id: w.id, website_name: w.name, kind: "obsolete_plugins", label: "Obsolete plugin cleanup (quarterly)",
      band: freshnessBand(w.obsolete_plugins_checked_at, w.obsolete_plugins, "quarterly"),
      checked_at: w.obsolete_plugins_checked_at, cadence_days: 90,
    });
    derived.push({
      website_id: w.id, website_name: w.name, kind: "search_console", label: "Search Console review (quarterly)",
      band: freshnessBand(w.search_console_checked_at, w.search_console_status, "quarterly"),
      checked_at: w.search_console_checked_at, cadence_days: 90,
    });
  }
  return { derived, custom: reminders ?? [] };
});

export const markChecked = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      website_id: z.string().uuid(),
      kind: z.enum(["theme_plugins", "obsolete_plugins", "search_console"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { admin, logAudit } = await import("./portal.server");
    const sb = admin();
    const col =
      data.kind === "theme_plugins" ? "theme_plugins_checked_at"
      : data.kind === "obsolete_plugins" ? "obsolete_plugins_checked_at"
      : "search_console_checked_at";
    const today = new Date().toISOString().slice(0, 10);
    await sb.from("websites").update({ [col]: today } as never).eq("id", data.website_id);
    await logAudit({
      action: "maintenance_checked",
      website_id: data.website_id,
      summary: `Marked ${data.kind.replace("_", " ")} as checked today`,
    });
    return { ok: true, checked_at: today };
  });
