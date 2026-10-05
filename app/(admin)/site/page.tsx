import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDraft } from "@/lib/content";
import { getEnv } from "@/lib/env";

export default async function SiteOverviewPage() {
  const slideshow = await getDraft<{ slides: unknown[] }>("slideshow");
  const { DB } = getEnv();
  const lastPublish = await DB.prepare(
    `SELECT version, created_at FROM publish_log ORDER BY created_at DESC LIMIT 1`,
  ).first<{ version: string; created_at: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-950">Site</h1>
        <p className="mt-1 text-slate-600">
          Edit clinic content drafts in D1, then publish JSON packs to R2 with Save to cloud.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Slideshow</CardTitle>
            <CardDescription>UIkit-compatible slides</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{slideshow?.slides?.length ?? 0}</p>
            <Link className="mt-3 inline-block text-sm text-teal-700 underline" href="/site/slideshow">
              Edit slideshow
            </Link>
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
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-teal-800">
            <Link href="/site/media">Media library</Link>
            <Link href="/site/seo">SEO settings</Link>
            <Link href="/site/settings">AI & email keys</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
