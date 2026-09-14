import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { Globe, LayoutDashboard, KeyRound, Star, FileSpreadsheet, Bell, ScrollText, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { lockPortal } from "@/lib/gate.functions";

const nav = [
  { to: "/websites", label: "Websites", Icon: Globe },
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/general-credentials", label: "General credentials", Icon: KeyRound },
  { to: "/premium", label: "Premium domains", Icon: Star },
  { to: "/spreadsheets", label: "Spreadsheets", Icon: FileSpreadsheet },
  { to: "/reminders", label: "Reminders", Icon: Bell },
  { to: "/audit", label: "Activity log", Icon: ScrollText },
] as const;

const SIDEBAR_BG = "#020713";

export function AppShell({
  children,
  title,
  actions,
  hideTitle = false,
}: {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
  hideTitle?: boolean;
}) {
  const router = useRouter();
  const lock = useServerFn(lockPortal);
  const [collapsed, setCollapsed] = useState(false);
  async function onLock() {
    await lock();
    await router.navigate({ to: "/" });
  }
  return (
    <div className={`min-h-screen grid ${collapsed ? "grid-cols-[65px_1fr]" : "grid-cols-[234px_1fr]"} transition-[grid-template-columns] duration-200`}>
      <aside
        className="text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen flex flex-col"
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        <div className="relative p-[10.8px] border-b border-sidebar-border flex items-center justify-between gap-[7.2px]">
          {!collapsed && (
            <img
              src="https://mockup.wiwy.com/wp-content/uploads/2026/07/master-portal-logo.jpg"
              alt="Master Portal"
              className="h-36 w-36 rounded-[10.8px] object-cover shadow-lg mx-auto md:h-[14.85rem] md:w-[14.85rem]"
            />
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`p-[7.2px] rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${collapsed ? "mx-auto" : "absolute top-[10.8px] right-[10.8px]"}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        </div>
        <nav className="flex-1 p-[10.8px] space-y-[3.6px]">
          {nav.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-[10.8px] px-[10.8px] py-[7.2px] rounded-md text-[13.1px] font-semibold text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${collapsed ? "justify-center" : ""}`}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground" }}
            >
              <Icon className="h-[14.4px] w-[14.4px] shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-[10.8px] border-t border-sidebar-border">
          <button
            onClick={onLock}
            title={collapsed ? "Lock portal" : undefined}
            className={`w-full flex items-center gap-[7.2px] px-[10.8px] py-[7.2px] rounded-md text-[13.1px] font-semibold text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-[14.4px] w-[14.4px] shrink-0" /> {!collapsed && "Lock portal"}
          </button>
        </div>
      </aside>
      <main className="flex flex-col min-w-0">
        <div className="portal-stage flex-1 min-w-0 p-5 md:p-6">
          {!hideTitle && (
            <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <div className="flex items-center gap-3">{actions}</div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
