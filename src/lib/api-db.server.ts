// Server only MariaDB API client.
// The browser never receives SITEGUARD_API_SECRET. All calls originate from
// TanStack Start server functions running on Vercel.
import { createHash, createHmac } from "node:crypto";

type Filter =
  | { op: "eq" | "neq"; column: string; value: unknown }
  | { op: "in"; column: string; value: unknown[] };

type Order = { column: string; ascending: boolean };

type QueryPayload = {
  operation: "select" | "insert" | "update" | "delete" | "upsert";
  table: string;
  select?: string;
  data?: unknown;
  filters?: Filter[];
  orders?: Order[];
  limit?: number;
  count?: "exact";
  head?: boolean;
  single?: "single" | "maybe";
};

type ApiResult<T = unknown> = {
  data: T;
  count?: number | null;
};

type DbResult<T = unknown> = {
  data: T | null;
  error: Error | null;
  count?: number | null;
};

function apiConfig() {
  const rawUrl = process.env.SITEGUARD_API_URL?.trim();
  const secret = process.env.SITEGUARD_API_SECRET?.trim();
  if (!rawUrl) throw new Error("SITEGUARD_API_URL is not set");
  if (!secret) throw new Error("SITEGUARD_API_SECRET is not set");

  // Use the PHP script explicitly. This avoids cPanel directory handling and
  // makes the deployment tolerant of users pasting either the API directory
  // or the full index.php URL into Vercel.
  const parsed = new URL(rawUrl);
  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path.toLowerCase().endsWith(".php")) {
    parsed.pathname = `${path || ""}/index.php`;
  }
  return { url: parsed.toString(), secret };
}

function encodeTransport(body: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
}

function signedRequestUrl(url: string, payload: string, secret: string) {
  const target = new URL(url);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const authKey = createHash("sha256").update(secret, "utf8").digest("hex");
  const signature = createHmac("sha256", authKey)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  target.searchParams.set("t", timestamp);
  target.searchParams.set("s", signature);
  return target.toString();
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(
      preview
        ? `SiteGuard API returned non JSON response (${response.status}): ${preview}`
        : `SiteGuard API returned an empty non JSON response (${response.status})`,
    );
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : `SiteGuard API request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

async function requestApi<T>(body: Record<string, unknown>): Promise<T> {
  const { url, secret } = apiConfig();
  const payload = encodeTransport(body);
  const target = signedRequestUrl(url, payload, secret);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "text/plain;charset=UTF-8",
      },
      body: payload,
      cache: "no-store",
      signal: controller.signal,
    });
    return await parseApiResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("SiteGuard API timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function diagnoseApi(): Promise<{
  ok: boolean;
  stage: "api" | "database" | "ready";
  message: string;
  version?: string;
}> {
  let config: ReturnType<typeof apiConfig>;
  try {
    config = apiConfig();
  } catch (error) {
    return { ok: false, stage: "api", message: toError(error).message };
  }

  try {
    const pingUrl = new URL(config.url);
    pingUrl.searchParams.set("ping", "1");
    const response = await fetch(pingUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const ping = await parseApiResponse<{ ok?: boolean; version?: string }>(response);
    if (!ping?.ok) {
      return { ok: false, stage: "api", message: "The PHP API did not answer its health probe" };
    }

    try {
      const database = await requestApi<{ ok?: boolean; database?: string }>({ action: "health" });
      if (database?.ok && database.database === "connected") {
        return {
          ok: true,
          stage: "ready",
          message: "PHP API and MariaDB are connected",
          version: ping.version,
        };
      }
      return { ok: false, stage: "database", message: "PHP API answered but MariaDB health check failed", version: ping.version };
    } catch (error) {
      return { ok: false, stage: "database", message: toError(error).message, version: ping.version };
    }
  } catch (error) {
    return { ok: false, stage: "api", message: toError(error).message };
  }
}

class QueryBuilder implements PromiseLike<DbResult<any>> {
  private operation: QueryPayload["operation"] = "select";
  private selectColumns = "*";
  private mutationData: unknown;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private rowLimit?: number;
  private countMode?: "exact";
  private headMode = false;
  private singleMode?: "single" | "maybe";
  private executed?: Promise<DbResult<any>>;

  constructor(private readonly table: string) {}

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selectColumns = columns;
    if (options?.count === "exact") this.countMode = "exact";
    if (options?.head) this.headMode = true;
    return this;
  }

  insert(data: unknown) {
    this.operation = "insert";
    this.mutationData = data;
    return this;
  }

  update(data: unknown) {
    this.operation = "update";
    this.mutationData = data;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  upsert(data: unknown) {
    this.operation = "upsert";
    this.mutationData = data;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ op: "neq", column, value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ op: "in", column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybe";
    return this.execute();
  }

  single() {
    this.singleMode = "single";
    return this.execute();
  }

  private execute(): Promise<DbResult<any>> {
    if (!this.executed) {
      this.executed = requestApi<ApiResult>({
        action: "query",
        query: {
          operation: this.operation,
          table: this.table,
          select: this.selectColumns,
          data: this.mutationData,
          filters: this.filters,
          orders: this.orders,
          limit: this.rowLimit,
          count: this.countMode,
          head: this.headMode,
          single: this.singleMode,
        } satisfies QueryPayload,
      })
        .then((result) => ({
          data: result.data ?? null,
          count: result.count ?? null,
          error: null,
        }))
        .catch((error) => ({
          data: null,
          count: null,
          error: toError(error),
        }));
    }
    return this.executed;
  }

  then<TResult1 = DbResult<any>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const apiDb = {
  from(table: string) {
    return new QueryBuilder(table);
  },

  async rpc(name: string, args: Record<string, unknown>): Promise<DbResult<any>> {
    try {
      const result = await requestApi<ApiResult>({ action: "rpc", name, args });
      return { data: result.data ?? null, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};
