import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSetting, saveSetting } from "@/lib/content";
import { getEnv } from "@/lib/env";
import {
  aiSettingsSchema,
  emailSettingsSchema,
  localeSettingsSchema,
  siteSettingsSchema,
} from "@/lib/schemas";
import { z } from "zod";

const bodySchema = z.object({
  site: siteSettingsSchema,
  ai: aiSettingsSchema,
  email: emailSettingsSchema,
  locale: localeSettingsSchema,
});

export async function PUT(request: Request) {
  try {
    await requireUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    await saveSetting("site", parsed.data.site);
    await saveSetting("ai", parsed.data.ai);
    await saveSetting("email", parsed.data.email);
    await saveSetting("locale", parsed.data.locale);

    // Publish a public, secret-free site settings blob for the static build.
    const { CONTENT } = getEnv();
    await CONTENT.put(
      "settings/site.json",
      JSON.stringify(
        {
          domain: parsed.data.site.domain.trim(),
          adminApiUrl: parsed.data.site.adminApiUrl.trim(),
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      { httpMetadata: { contentType: "application/json; charset=utf-8" } },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET() {
  try {
    await requireUser();
    const site = (await getSetting("site")) ?? { domain: "", adminApiUrl: "" };
    return NextResponse.json({ site });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
