import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/portal/AppShell";
import { ProjectTable } from "@/components/portal/ProjectTable";
import { llmAccounts, wiwyProjects } from "@/lib/tools";

export const Route = createFileRoute("/_gated/tools")({
  head: () => ({
    meta: [{ title: "Tools — Vault Portal" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell title="Tools">
      <p className="text-sm text-muted-foreground mb-6">
        Your WiWY tools and LLM accounts in one place.
      </p>
      <nav aria-label="Tool sections" className="flex flex-wrap gap-2 mb-6">
        {[
          { id: "wiwy", label: "WiWY Assets", count: wiwyProjects.length },
          { id: "llms", label: "LLMs", count: llmAccounts.length },
        ].map(({ id, label, count }) => (
          <a
            key={id}
            href={`#tools-${id}`}
            className="inline-flex items-center gap-2 rounded-md bg-card border border-border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            {label}
            <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
          </a>
        ))}
      </nav>
      <div className="space-y-6">
        <section
          id="tools-wiwy"
          aria-labelledby="heading-wiwy"
          className="scroll-mt-6 bg-card border border-border rounded-xl overflow-hidden"
        >
          <div className="px-4 py-4 bg-muted/30 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <h2 id="heading-wiwy" className="text-base font-semibold">
                WiWY Assets
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {wiwyProjects.length} of {wiwyProjects.length} projects
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Projects connected to a custom wiwy.com subdomain.
            </p>
          </div>
          <ProjectTable projects={wiwyProjects} label="WiWY Assets" />
        </section>
        <section
          id="tools-llms"
          aria-labelledby="heading-llms"
          className="scroll-mt-6 bg-card border border-border rounded-xl overflow-hidden"
        >
          <div className="px-4 py-4 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
            <h2 id="heading-llms" className="text-base font-semibold">
              LLMs
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {llmAccounts.length} accounts
            </span>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-3">
            {llmAccounts.map((account) => (
              <article key={account.email} className="border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-4">{account.name}</h3>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${account.email}`}
                        className="text-info hover:underline break-all focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
                      >
                        {account.email}
                      </a>
                    </dd>
                  </div>
                  {"password" in account && (
                    <div>
                      <dt className="text-xs text-muted-foreground mb-1">Password</dt>
                      <dd>{account.password}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
