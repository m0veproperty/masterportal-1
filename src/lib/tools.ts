import type { VercelProject } from "@/lib/vercel-projects";

export const wiwyProjects: VercelProject[] = [
  {
    name: "wiwy-web-builder",
    domain: "wb.wiwy.com",
    repository: "m0veproperty/wiwy-web-builder",
  },
  {
    name: "projectm",
    domain: "pm.wiwy.com",
    repository: "m0veproperty/projectm",
  },
  {
    name: "wiwyinbox",
    domain: "inbox.wiwy.com",
    repository: "m0veproperty/wiwyinbox",
  },
  {
    name: "masterportal",
    domain: "mp.wiwy.com",
    repository: "m0veproperty/masterportal-1",
  },
  {
    name: "mx-data-analytics",
    domain: "mx-analytics.wiwy.com",
    repository: null,
  },
  {
    name: "promptgenerator-cpanel",
    domain: "prompthub.wiwy.com",
    repository: "m0veproperty/promptgenerator-cpanel",
  },
  {
    name: "promptstudio-cpanel",
    domain: "prompt-studio.wiwy.com",
    repository: "m0veproperty/promptstudio-cpanel",
  },
  {
    name: "invoicewiwy-cpanel",
    domain: "invoice.wiwy.com",
    repository: "m0veproperty/invoicewiwy-cpanel",
  },
  {
    name: "viewport-sync",
    domain: "inspect.wiwy.com",
    repository: null,
  },
  {
    name: "fotor-wiwy",
    domain: "fotor.wiwy.com",
    repository: "m0veproperty/panel-express",
  },
  {
    name: "screen-wiwy",
    domain: "screen.wiwy.com",
    repository: "m0veproperty/bb-ai-agents",
  },
];

export const llmAccounts = [
  { name: "GPT Account 1", email: "majentasolutions@gmail.com", password: "TBC" },
  { name: "GPT Account 2", email: "teams@madx.digital" },
  { name: "GPT Account 3", email: "onsite@madx.digital" },
] as const;
