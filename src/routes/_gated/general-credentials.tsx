import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/portal/AppShell";
import { CredentialField } from "@/components/portal/CredentialField";
import { listGeneralCredentials } from "@/lib/portal.functions";

const opts = queryOptions({ queryKey: ["general-credentials"], queryFn: () => listGeneralCredentials() });

export const Route = createFileRoute("/_gated/general-credentials")({
  head: () => ({
    meta: [
      { title: "General credentials — Vault Portal" },
      { name: "description", content: "Private portal-wide credentials for hosting, affiliate programs, tools, and services." },
      { property: "og:title", content: "General credentials — Vault Portal" },
      { property: "og:description", content: "Private portal-wide credentials for hosting, affiliate programs, tools, and services." },
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
  const bySection = new Map<string, typeof data>();
  for (const row of data) {
    if (!bySection.has(row.section)) bySection.set(row.section, [] as never);
    bySection.get(row.section)!.push(row);
  }
  return (
    <AppShell title="General credentials">
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Portal-wide accounts: hosting, affiliate programs, tooling, and other services not tied to a single website.
      </p>
      <div className="space-y-8">
        {[...bySection.entries()].map(([section, rows]) => (
          <section key={section}>
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">{section}</h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">URL</th>
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Password</th>
                    <th className="px-4 py-3 font-medium">Backup</th>
                  </tr>
                </thead>
                <tbody className="spotlight-group">
                  {rows.map((r) => (
                    <tr key={r.id} className="spotlight-item border-t border-border">
                      <td className="px-4 py-3 font-medium">{r.site}{r.notes && <div className="text-xs text-muted-foreground font-normal mt-0.5">{r.notes}</div>}</td>
                      <td className="px-4 py-3">{r.url && <a href={r.url.startsWith("http") ? r.url : `https://${r.url}`} target="_blank" rel="noopener noreferrer" className="text-info hover:underline text-xs">{r.url}</a>}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.username}</td>
                      <td className="px-4 py-3 w-[300px]"><CredentialField generalCredentialId={r.id} field="password" label={`${r.site} password`} /></td>
                      <td className="px-4 py-3 w-[300px]">
                        {r.backup_username ? (
                          <div>
                            <div className="font-mono text-xs mb-1">{r.backup_username}</div>
                            <CredentialField generalCredentialId={r.id} field="backup" label={`${r.site} backup`} />
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {data.length === 0 && <div className="text-sm text-muted-foreground">No general credentials yet.</div>}
      </div>
    </AppShell>
  );
}
