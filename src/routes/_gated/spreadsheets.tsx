import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/portal/AppShell";
import { listSpreadsheets } from "@/lib/portal.functions";
import { FileSpreadsheet, ExternalLink } from "lucide-react";

const opts = queryOptions({ queryKey: ["spreadsheets"], queryFn: () => listSpreadsheets() });

export const Route = createFileRoute("/_gated/spreadsheets")({
  head: () => ({
    meta: [
      { title: "Spreadsheets — Vault Portal" },
      { name: "description", content: "Private supporting spreadsheets for the website portfolio." },
      { property: "og:title", content: "Spreadsheets — Vault Portal" },
      { property: "og:description", content: "Private supporting spreadsheets for the website portfolio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  return (
    <AppShell title="Spreadsheets">
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">Central place for supporting spreadsheets. This area can be expanded over time.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.length === 0 && <div className="text-sm text-muted-foreground">No spreadsheets yet.</div>}
        {data.map((s) => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start gap-3 mb-2">
              <FileSpreadsheet className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-medium">{s.name}</div>
                {s.description && <div className="text-xs text-muted-foreground mt-1">{s.description}</div>}
              </div>
            </div>
            {s.url && (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-info hover:underline">
                Open <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
