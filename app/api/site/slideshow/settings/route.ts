import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getSlideshowSettings,
  normalizeSlideshowSettings,
  saveSlideshowSettings,
} from "@/lib/slideshow";
import { z } from "zod";

const sizeSchema = z.object({
  width: z.union([z.string(), z.number()]),
  height: z.union([z.string(), z.number()]),
  quality: z.union([z.string(), z.number()]),
});

const settingsSchema = z.object({
  animation: z.string(),
  autoplay: z.boolean(),
  autoplayInterval: z.union([z.string(), z.number()]),
  animationDuration: z.union([z.string(), z.number()]).optional(),
  kenburns: z.boolean().optional(),
  finite: z.boolean(),
  pauseOnHover: z.boolean(),
  velocity: z.union([z.string(), z.number()]),
  swipeThreshold: z.union([z.string(), z.number()]).optional(),
  ratio: z.string(),
  minHeight: z.string().optional().default(""),
  maxHeight: z.string().optional().default(""),
  index: z.union([z.string(), z.number()]).optional().default(0),
  output: z
    .object({
      desktop: sizeSchema,
      mobileLandscape: sizeSchema,
      mobilePortrait: sizeSchema,
      mobileViewport: z.object({
        width: z.union([z.string(), z.number()]),
        height: z.union([z.string(), z.number()]),
      }),
      mobileMaxWidth: z.union([z.string(), z.number()]),
      tabletMaxWidth: z.union([z.string(), z.number()]),
      outputFormat: z.enum(["webp", "jpeg", "avif"]),
    })
    .optional(),
});

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ settings: await getSlideshowSettings() });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser();
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const d = parsed.data;
    const settings = await saveSlideshowSettings(
      normalizeSlideshowSettings({
        animation: d.animation,
        autoplay: d.autoplay,
        autoplayInterval: Number(d.autoplayInterval),
        animationDuration: d.animationDuration != null ? Number(d.animationDuration) : undefined,
        kenburns: d.kenburns,
        finite: d.finite,
        pauseOnHover: d.pauseOnHover,
        velocity: Number(d.velocity),
        swipeThreshold: d.swipeThreshold != null ? Number(d.swipeThreshold) : undefined,
        ratio: d.ratio,
        minHeight: d.minHeight,
        maxHeight: d.maxHeight,
        index: Number(d.index),
        output: d.output
          ? {
              desktop: {
                width: Number(d.output.desktop.width),
                height: Number(d.output.desktop.height),
                quality: Number(d.output.desktop.quality),
              },
              mobileLandscape: {
                width: Number(d.output.mobileLandscape.width),
                height: Number(d.output.mobileLandscape.height),
                quality: Number(d.output.mobileLandscape.quality),
              },
              mobilePortrait: {
                width: Number(d.output.mobilePortrait.width),
                height: Number(d.output.mobilePortrait.height),
                quality: Number(d.output.mobilePortrait.quality),
              },
              mobileViewport: {
                width: Number(d.output.mobileViewport.width),
                height: Number(d.output.mobileViewport.height),
              },
              mobileMaxWidth: Number(d.output.mobileMaxWidth),
              tabletMaxWidth: Number(d.output.tabletMaxWidth),
              outputFormat: d.output.outputFormat,
            }
          : undefined,
      }),
    );
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 400 },
    );
  }
}
