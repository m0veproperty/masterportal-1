import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/portal/AppShell";

export const Route = createFileRoute("/_gated/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — Vault Portal" },
      { name: "description", content: "Private reminders for maintenance, plugin, and search console review cycles." },
      { property: "og:title", content: "Reminders — Vault Portal" },
      { property: "og:description", content: "Private reminders for maintenance, plugin, and search console review cycles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell title="Reminders">
      <div aria-hidden="true" className="min-h-[55vh]" />
    </AppShell>
  );
}
