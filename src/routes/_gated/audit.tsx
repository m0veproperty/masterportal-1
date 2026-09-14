import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/portal/AppShell";
import { listAudit } from "@/lib/portal.functions";

const opts = queryOptions({ queryKey: ["audit"], queryFn: () => listAudit() });

export const Route = createFileRoute("/_gated/audit")({
  head: () => ({
    meta: [
      { title: "Activity log — Vault Portal" },
      { name: "description", content: "Private audit trail for portal access, credential actions, and website maintenance updates." },
      { property: "og:title", content: "Activity log — Vault Portal" },
      { property: "og:description", content: "Private audit trail for portal access, credential actions, and website maintenance updates." },
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
    <AppShell title="Activity log">
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Sensitive values are never recorded — only the action, what was touched, and when.
      </p>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">Website</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No activity recorded yet.</td></tr>
            )}
            {data.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
                <td className="px-4 py-3">{a.summary}</td>
                <td className="px-4 py-3">{a.website_id ? <Link to="/websites/$id" params={{ id: a.website_id }} className="text-info hover:underline text-xs">view</Link> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
