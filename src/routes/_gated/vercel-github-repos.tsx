import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, GitBranch, Globe, Search, Triangle } from "lucide-react";
import { AppShell } from "@/components/portal/AppShell";
import { vercelProjects } from "@/lib/vercel-projects";

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
const externalLinkClass =
  "inline-flex items-center gap-1.5 text-sm text-info hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded-sm";

function Page() {
  const [search, setSearch] = useState("");
  const [connection, setConnection] = useState("all");
  const [sort, setSort] = useState("original");
  const query = search.trim().toLowerCase();
  const filtered = vercelProjects.filter((project) => {
    const matchesSearch = `${project.name} ${project.domain} ${project.repository ?? ""}`
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Vercel projects and their live websites and connected GitHub repositories
            </caption>
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Project
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Live website
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  GitHub repository
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Vercel
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.domain}
                  className="border-t border-border even:bg-muted/25 hover:bg-muted/50"
                >
                  <th scope="row" className="px-4 py-4 align-top font-semibold">
                    {project.name}
                  </th>
                  <td className="px-4 py-4 align-top">
                    <a
                      href={`https://${project.domain}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={externalLinkClass}
                    >
                      {project.domain}
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    </a>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {project.repository ? (
                      <a
                        href={`https://github.com/${project.repository}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={externalLinkClass}
                      >
                        <GitBranch className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {project.repository}
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No repository connected</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <a
                      href={`https://vercel.com/wi-wy/${project.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${externalLinkClass} whitespace-nowrap`}
                      aria-label={`Manage ${project.name} in Vercel`}
                    >
                      Manage project
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    No projects match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          Directory added 3 October 2026.
        </div>
      </div>
    </AppShell>
  );
}
