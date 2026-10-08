import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDraft } from "@/lib/content";
import { getEnv } from "@/lib/env";

const sections = [
  { href: "/site/header/logo", title: "Header · Logo", desc: "Clinic logo assets" },
  { href: "/site/header/icons", title: "Header · Icons", desc: "Social and utility icons" },
  { href: "/site/header/menu", title: "Header · Menu", desc: "Navigation links" },
  { href: "/site/slideshow", title: "Slideshow", desc: "UIkit slideshow slides" },
  { href: "/site/services", title: "Services", desc: "Clinic services list" },
  { href: "/site/stuff", title: "Stuff", desc: "Staff / misc content" },
  { href: "/site/articles", title: "Articles", desc: "Blog and news articles" },
];

export default async function SiteOverviewPage() {
  const slideshow = await getDraft<{ slides: unknown[] }>("slideshow");
  const { SITE_DB } = getEnv();
  const lastPublish = await SITE_DB.prepare(
    `SELECT version, created_at FROM publish_log ORDER BY created_at DESC LIMIT 1`,
  ).first<{ version: string; created_at: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-200">Site</h1>
        <p className="mt-1 text-slate-400">
          Edit clinic content drafts in D1, then publish JSON packs to R2 with Save to cloud.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Slideshow</CardTitle>
            <CardDescription>Active slides</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-teal-200">{slideshow?.slides?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last publish</CardTitle>
            <CardDescription>R2 content pack</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{lastPublish?.version ?? "Never published"}</p>
            <p className="mt-1 text-xs text-slate-500">{lastPublish?.created_at ?? "—"}</p>
          </CardContent>
        </Card>
        {sections.map((s) => (
          <Card key={s.href}>
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-sm text-teal-300 underline" href={s.href}>
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
