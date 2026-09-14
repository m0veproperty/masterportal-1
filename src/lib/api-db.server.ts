// Server-only MariaDB API client.
// The browser never receives SITEGUARD_API_SECRET. All calls originate from
// TanStack Start server functions running on Vercel.

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

function encodeTransport(body: Record<string, unknown>, secret: string) {
  // cPanel ModSecurity can reject JSON bodies containing database operation
  // words before PHP receives the request. Send an opaque base64url payload
  // as a conventional form POST instead. PHP decodes it after Apache accepts it.
  const payload = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  return new URLSearchParams({ key: secret, payload }).toString();
}

async function requestApi<T>(body: Record<string, unknown>): Promise<T> {
  const { url, secret } = apiConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": "SiteGuard-Vercel/1.1",
      },
      body: encodeTransport(body, secret),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      if (response.status === 403) {
        throw new Error("SiteGuard API request was blocked by cPanel before PHP handled it (403)");
      }
      throw new Error(`SiteGuard API returned invalid JSON (${response.status})`);
    }

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error?: unknown }).error)
          : `SiteGuard API request failed (${response.status})`;
      throw new Error(message);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("SiteGuard API timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
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
      }).then((result) => ({
        data: result.data ?? null,
        count: result.count ?? null,
        error: null,
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
