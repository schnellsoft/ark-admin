"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  CloudUpload,
  FileText,
  ImageIcon,
  Images,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquare,
  PanelLeft,
  Settings2,
  Shapes,
  Sparkles,
  Stethoscope,
  Ticket,
  Users,
  X,
  Image as ImageLucide,
  Link2,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SaveToCloudButton } from "@/components/save-to-cloud-button";
import { LiveAlerts } from "@/components/live-alerts";
import { PushEnable } from "@/components/push-enable";
import { I18nProvider, LanguageSwitcher, useI18n } from "@/components/i18n-provider";

type NavLeaf = {
  href: string;
  labelKey: string;
  icon?: React.ComponentType<{ className?: string }>;
};
type NavBranch = {
  id: string;
  labelKey: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: Array<NavLeaf | NavBranch>;
};

function isBranch(node: NavLeaf | NavBranch): node is NavBranch {
  return "children" in node;
}

const siteTree: NavBranch = {
  id: "site",
  labelKey: "nav.site",
  icon: LayoutDashboard,
  children: [
    { href: "/site", labelKey: "nav.overview", icon: LayoutDashboard },
    {
      id: "header",
      labelKey: "nav.header",
      icon: PanelLeft,
      children: [
        { href: "/site/header/logo", labelKey: "nav.logo", icon: ImageLucide },
        { href: "/site/header/icons", labelKey: "nav.headerIcons", icon: Sparkles },
        { href: "/site/header/menu", labelKey: "nav.menu", icon: List },
      ],
    },
    { href: "/site/slideshow", labelKey: "nav.slideshow", icon: Images },
    { href: "/site/services", labelKey: "nav.services", icon: Stethoscope },
    { href: "/site/stuff", labelKey: "nav.stuff", icon: Users },
    { href: "/site/articles", labelKey: "nav.articles", icon: FileText },
    { href: "/site/media", labelKey: "nav.media", icon: ImageIcon },
    { href: "/site/icons", labelKey: "nav.icons", icon: Shapes },
    { href: "/site/seo", labelKey: "nav.seo", icon: Link2 },
    { href: "/site/settings", labelKey: "nav.settings", icon: Settings2 },
  ],
};

const userLinks: NavLeaf[] = [
  { href: "/users", labelKey: "nav.accounts", icon: Users },
  { href: "/users/messages", labelKey: "nav.messages", icon: MessageSquare },
  { href: "/users/tickets", labelKey: "nav.tickets", icon: Ticket },
  { href: "/users/geo", labelKey: "nav.geo", icon: MapPin },
];

function pathMatches(pathname: string, href: string) {
  if (href === "/site") return pathname === "/site";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function collectOpenIds(pathname: string, branch: NavBranch, trail: string[] = []): string[] {
  const nextTrail = [...trail, branch.id];
  for (const child of branch.children) {
    if (isBranch(child)) {
      const found = collectOpenIds(pathname, child, nextTrail);
      if (found.length) return found;
    } else if (pathMatches(pathname, child.href)) {
      return nextTrail;
    }
  }
  if (pathname.startsWith("/site")) return ["site"];
  return [];
}

function NavLink({
  href,
  labelKey,
  icon: Icon,
  pathname,
  unreadCount,
  depth = 0,
  onNavigate,
}: NavLeaf & {
  pathname: string;
  unreadCount?: number;
  depth?: number;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const active = pathMatches(pathname, href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-teal-700/90 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
      )}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span className="truncate">{t(labelKey)}</span>
      {href === "/users/messages" && unreadCount && unreadCount > 0 ? (
        <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function AccordionBranch({
  branch,
  pathname,
  openIds,
  toggle,
  depth = 0,
  unreadCount,
  onNavigate,
}: {
  branch: NavBranch;
  pathname: string;
  openIds: Set<string>;
  toggle: (id: string) => void;
  depth?: number;
  unreadCount?: number;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const open = openIds.has(branch.id);
  const Icon = branch.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => toggle(branch.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
          open ? "bg-slate-800 text-teal-200" : "text-slate-200 hover:bg-slate-800/80",
        )}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        aria-expanded={open}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
        <span className="flex-1 truncate">{t(branch.labelKey)}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="mt-1 space-y-1 border-l border-slate-700/80 ml-4 pl-1">
          {branch.children.map((child) =>
            isBranch(child) ? (
              <AccordionBranch
                key={child.id}
                branch={child}
                pathname={pathname}
                openIds={openIds}
                toggle={toggle}
                depth={depth + 1}
                unreadCount={unreadCount}
                onNavigate={onNavigate}
              />
            ) : (
              <NavLink
                key={child.href}
                {...child}
                pathname={pathname}
                depth={depth + 1}
                unreadCount={unreadCount}
                onNavigate={onNavigate}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({
  pathname,
  unreadCount,
  onNavigate,
}: {
  pathname: string;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(collectOpenIds(pathname, siteTree)));

  useEffect(() => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const id of collectOpenIds(pathname, siteTree)) next.add(id);
      return next;
    });
  }, [pathname]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav className="space-y-6">
      <div className="space-y-1">
        <AccordionBranch
          branch={siteTree}
          pathname={pathname}
          openIds={openIds}
          toggle={toggle}
          unreadCount={unreadCount}
          onNavigate={onNavigate}
        />
      </div>
      <div>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("nav.users")}
        </p>
        <ul className="space-y-1">
          {userLinks.map((link) => (
            <li key={link.href}>
              <NavLink {...link} pathname={pathname} unreadCount={unreadCount} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function AdminShellInner({
  children,
  userName,
  unreadCount,
}: {
  children: React.ReactNode;
  userName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const actions = useMemo(
    () => (
      <>
        <LanguageSwitcher />
        <LiveAlerts unreadCount={unreadCount} />
        <PushEnable />
        <SaveToCloudButton />
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-200 hover:bg-slate-800"
          >
            {t("app.logout")}
          </button>
        </form>
      </>
    ),
    [t, unreadCount],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#134e4a55,_#0b1220_42%,_#020617)] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[260px_1fr]">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 backdrop-blur lg:hidden">
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg text-teal-300">Ark Admin</p>
            <p className="text-xs text-slate-500">{userName}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-600 bg-slate-900"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <aside
          className={cn(
            "rounded-2xl border border-slate-700/70 bg-slate-900/85 p-4 shadow-sm backdrop-blur",
            "lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto",
            mobileOpen ? "block" : "hidden",
          )}
        >
          <div className="mb-6 hidden lg:block">
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-teal-300">
              Ark Admin
            </p>
            <p className="text-xs text-slate-500">Dental clinic control</p>
          </div>
          <SidebarNav
            pathname={pathname}
            unreadCount={unreadCount}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="hidden flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 shadow-sm backdrop-blur lg:flex">
            <div>
              <p className="text-sm text-slate-500">{t("app.signedIn")}</p>
              <p className="font-medium text-slate-100">{userName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </header>

          <div className="flex flex-wrap items-center gap-2 lg:hidden">{actions}</div>

          <main className="min-w-0 flex-1 rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4 sm:p-5 shadow-sm backdrop-blur">
            {children}
          </main>
        </div>
      </div>
      <div className="pointer-events-none fixed bottom-4 right-4 hidden items-center gap-2 rounded-full bg-teal-900/90 px-3 py-2 text-xs text-teal-100 shadow-lg md:flex">
        <CloudUpload className="h-3.5 w-3.5" />
        Drafts sync to D1 · Publish with Save to cloud
      </div>
    </div>
  );
}

export function AdminShell(props: {
  children: React.ReactNode;
  userName: string;
  unreadCount: number;
}) {
  return (
    <I18nProvider>
      <AdminShellInner {...props} />
    </I18nProvider>
  );
}
