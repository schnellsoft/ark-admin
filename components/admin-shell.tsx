"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudUpload,
  ImageIcon,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings2,
  Ticket,
  Users,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SaveToCloudButton } from "@/components/save-to-cloud-button";
import { LiveAlerts } from "@/components/live-alerts";
import { PushEnable } from "@/components/push-enable";

const siteLinks = [
  { href: "/site", label: "Overview", icon: LayoutDashboard },
  { href: "/site/slideshow", label: "Slideshow", icon: Images },
  { href: "/site/media", label: "Media", icon: ImageIcon },
  { href: "/site/seo", label: "SEO", icon: Settings2 },
  { href: "/site/settings", label: "Settings", icon: Settings2 },
];

const userLinks = [
  { href: "/users", label: "Accounts", icon: Users },
  { href: "/users/messages", label: "Messages", icon: MessageSquare },
  { href: "/users/tickets", label: "Tickets", icon: Ticket },
  { href: "/users/geo", label: "Geolocation", icon: MapPin },
];

export function AdminShell({
  children,
  userName,
  unreadCount,
}: {
  children: React.ReactNode;
  userName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#d8f3ef,_#f4f7fb_42%,_#eef2f7)] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="mb-6">
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-teal-900">
              Ark Admin
            </p>
            <p className="text-xs text-slate-500">Dental clinic control</p>
          </div>

          <nav className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Site</p>
              <ul className="space-y-1">
                {siteLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        pathname === link.href
                          ? "bg-teal-700 text-white"
                          : "text-slate-700 hover:bg-teal-50",
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Users</p>
              <ul className="space-y-1">
                {userLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        pathname === link.href
                          ? "bg-teal-700 text-white"
                          : "text-slate-700 hover:bg-teal-50",
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                      {link.href === "/users/messages" && unreadCount > 0 ? (
                        <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <div>
              <p className="text-sm text-slate-500">Signed in as</p>
              <p className="font-medium">{userName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LiveAlerts unreadCount={unreadCount} />
              <PushEnable />
              <SaveToCloudButton />
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50"
                >
                  Log out
                </button>
              </form>
            </div>
          </header>
          <main className="min-w-0 flex-1 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
            {children}
          </main>
        </div>
      </div>
      <div className="pointer-events-none fixed bottom-4 right-4 hidden items-center gap-2 rounded-full bg-teal-800 px-3 py-2 text-xs text-white shadow-lg md:flex">
        <CloudUpload className="h-3.5 w-3.5" />
        Drafts sync to D1 · Publish with Save to cloud
      </div>
    </div>
  );
}
