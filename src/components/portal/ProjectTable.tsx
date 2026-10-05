import { ExternalLink, GitBranch } from "lucide-react";
import type { VercelProject } from "@/lib/vercel-projects";

const externalLinkClass =
  "inline-flex items-center gap-1.5 text-sm text-info hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded-sm";

export function ProjectTable({ projects, label }: { projects: VercelProject[]; label: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          {label}: live websites and connected GitHub repositories
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
                <div className="space-y-3">
                  {(
                    project.landingPages ?? [
                      { label: project.domain, url: `https://${project.domain}/` },
                    ]
                  ).map((page) => (
                    <div key={page.url}>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={externalLinkClass}
                      >
                        {page.label}
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </a>
                      {project.landingPages && (
                        <div className="mt-1 text-xs text-muted-foreground break-all">
                          {page.url.replace(/^https:\/\//, "")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                No projects in this section match your search or filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
