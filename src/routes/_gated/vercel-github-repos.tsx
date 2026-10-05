import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GitBranch, Globe, Search, Triangle } from "lucide-react";
import { ProjectTable } from "@/components/portal/ProjectTable";
import { AppShell } from "@/components/portal/AppShell";
import { assetSections, getAssetSection, vercelProjects } from "@/lib/vercel-projects";

export const Route = createFileRoute("/_gated/vercel-github-repos")({
  head: () => ({
    meta: [
      { title: "Vercel & GitHub Repos — Vault Portal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

const connectedCount = vercelProjects.filter((project) => project.repository).length;

function Page() {
  const [search, setSearch] = useState("");
  const [connection, setConnection] = useState("all");
  const [sort, setSort] = useState("original");
  const query = search.trim().toLowerCase();
  const filtered = vercelProjects.filter((project) => {
    const matchesSearch =
      `${project.name} ${project.domain} ${project.repository ?? ""} ${project.landingPages?.map((page) => `${page.label} ${page.url}`).join(" ") ?? ""}`
        .toLowerCase()
        .includes(query);
    const matchesConnection =
      connection === "all" ||
      (connection === "connected" ? !!project.repository : !project.repository);
    return matchesSearch && matchesConnection;
  });
  const projects =
    sort === "name" ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : filtered;

  return (
    <AppShell title="Vercel & GitHub Repos">
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Your project directory. Open a live website, manage its Vercel project, or jump to the
        connected GitHub repository.
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Vercel projects", value: vercelProjects.length, Icon: Triangle },
          { label: "Connected repositories", value: connectedCount, Icon: GitBranch },
          {
            label: "No repository connected",
            value: vercelProjects.length - connectedCount,
            Icon: Globe,
          },
        ].map(({ label, value, Icon }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <Icon className="w-5 h-5 text-info" aria-hidden="true" />
            <div>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <nav aria-label="Asset sections" className="flex flex-wrap gap-2 mb-6">
        {assetSections.map((section) => (
          <a
            key={section.id}
            href={`#assets-${section.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-card border border-border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            {section.label}
            <span className="text-xs text-muted-foreground tabular-nums">
              {vercelProjects.filter((project) => getAssetSection(project) === section.id).length}
            </span>
          </a>
        ))}
      </nav>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 flex flex-wrap items-end gap-4 border-b border-border">
          <div className="flex-1 min-w-48">
            <label htmlFor="project-search" className="block text-xs font-medium mb-2">
              Search projects
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="project-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Project, domain or repository…"
                className="w-full h-9 pl-9 pr-3 border border-input rounded-md bg-background text-sm focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>
          </div>
          <div>
            <label htmlFor="repo-connection" className="block text-xs font-medium mb-2">
              GitHub connection
            </label>
            <select
              id="repo-connection"
              value={connection}
              onChange={(event) => setConnection(event.target.value)}
              className="h-9 px-3 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All projects</option>
              <option value="connected">Connected</option>
              <option value="unconnected">No repository connected</option>
            </select>
          </div>
          <div>
            <label htmlFor="project-sort" className="block text-xs font-medium mb-2">
              Sort by
            </label>
            <select
              id="project-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-9 px-3 border border-input rounded-md bg-background text-sm"
            >
              <option value="original">Provided order</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
        <div className="px-4 py-3 text-xs text-muted-foreground" role="status">
          Showing {projects.length} of {vercelProjects.length} projects
        </div>
        <div className="space-y-6 p-4">
          {assetSections.map((section) => {
            const sectionProjects = projects.filter(
              (project) => getAssetSection(project) === section.id,
            );
            const total = vercelProjects.filter(
              (project) => getAssetSection(project) === section.id,
            ).length;
            return (
              <section
                key={section.id}
                id={`assets-${section.id}`}
                aria-labelledby={`heading-${section.id}`}
                className="scroll-mt-6 border border-border rounded-xl overflow-hidden"
              >
                <div className="px-4 py-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id={`heading-${section.id}`} className="text-base font-semibold">
                      {section.label}
                    </h2>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {sectionProjects.length} of {total} projects
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                </div>
                <ProjectTable projects={sectionProjects} label={section.label} />
              </section>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          Directory added 3 October 2026.
        </div>
      </div>
    </AppShell>
  );
}
