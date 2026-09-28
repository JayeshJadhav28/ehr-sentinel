import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ChevronRight,
  Database,
  Eye,
  History,
  LogOut,
  Menu,
  RotateCcw,
  Shield,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { logout } from "@/lib/api/auth.functions";
import { NAV_ITEMS } from "@/lib/constants";
import { canSeeNav } from "@/lib/authz/policies";
import type { CurrentUser } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

/* ── Nav icon map ───────────────────────────────────────────────── */
const NAV_ICONS: Record<string, ReactNode> = {
  "/overview":   <Activity   className="h-4 w-4" aria-hidden />,
  "/patients":   <Users      className="h-4 w-4" aria-hidden />,
  "/audit":      <History    className="h-4 w-4" aria-hidden />,
  "/alerts":     <ShieldAlert className="h-4 w-4" aria-hidden />,
  "/behavior":   <Eye        className="h-4 w-4" aria-hidden />,
  "/scenarios":  <RotateCcw  className="h-4 w-4" aria-hidden />,
};

/* ── Logo mark ──────────────────────────────────────────────────── */
function SentinelMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden
      className={cn("h-7 w-7", className)}
    />
  );
}

/* ── Sidebar nav item ───────────────────────────────────────────── */
function NavItem({
  to,
  label,
  icon,
  active,
  onClick,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick?: (() => void) | undefined;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent font-semibold text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
      {active && (
        <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" aria-hidden />
      )}
    </Link>
  );
}

/* ── Demo badge ─────────────────────────────────────────────────── */
function DemoBadge() {
  return (
    <span className="demo-badge" role="note" aria-label="Demo environment — synthetic data only">
      <Database className="h-3 w-3" aria-hidden />
      Demo · Synthetic data
    </span>
  );
}

/* ── Sidebar content (shared between desktop and mobile drawer) ─── */
function SidebarContent({
  user,
  items,
  pathname,
  onNav,
}: {
  user: CurrentUser;
  items: readonly (typeof NAV_ITEMS)[number][];
  pathname: string;
  onNav?: (() => void) | undefined;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <SentinelMark />
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">
            EHR Sentinel
          </p>
          <p className="text-[11px] leading-none text-muted-foreground">
            Access monitoring
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-1" aria-label="Main navigation">
        {items.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={NAV_ICONS[item.to] ?? <Shield className="h-4 w-4" aria-hidden />}
              active={active}
              onClick={onNav}
            />
          );
        })}
      </nav>

      {/* User + demo notice */}
      <div className="border-t border-border p-3 space-y-3">
        <div className="flex items-center gap-2.5 px-1">
          {/* Avatar initial */}
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
            aria-hidden
          >
            {user.displayName?.[0] ?? "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">
              {user.displayName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.roleLabel}
              {user.departmentName ? ` · ${user.departmentName}` : ""}
            </p>
          </div>
        </div>

        <DemoBadge />

        <p className="text-[11px] leading-snug text-muted-foreground px-1">
          Synthetic data only. Not a medical device.
        </p>
      </div>
    </>
  );
}

/* ── AppShell ───────────────────────────────────────────────────── */
export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = useServerFn(logout);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) =>
    canSeeNav(user.role, item.resource),
  );

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside
        className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex"
        aria-label="Application sidebar"
      >
        <SidebarContent
          user={user}
          items={items}
          pathname={pathname}
        />
      </aside>

      {/* ── Mobile drawer overlay ────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <SidebarContent
              user={user}
              items={items}
              pathname={pathname}
              onNav={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Topbar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <DemoBadge />

            <span className="hidden text-xs text-muted-foreground xl:inline">
              Detect abnormal access · Preserve legitimate care · Explain every alert
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* User info */}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">
                {user.displayName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {user.roleLabel}
                {user.departmentName ? ` · ${user.departmentName}` : ""}
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 p-4 lg:p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}