import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(["admin", "staff", "patient"]),
  password: z.string().min(6).optional(),
  locale: z.string().min(2).max(10).default("en"),
});

export const userUpdateSchema = userCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
  phone: z.string().max(40).optional(),
});

export const ticketCreateSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  fromName: z.string().min(1).max(120),
  fromEmail: z.string().email(),
});

export const ticketStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "closed"]),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const slideSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  html: z.string().max(20000),
  mediaKey: z.string().nullable(),
  mediaType: z.enum(["image", "video"]).default("image"),
  order: z.number().int().nonnegative(),
});

export const slideshowSchema = z.object({
  slides: z.array(slideSchema),
});

export const homeContentSchema = z.object({
  headline: z.string().max(200),
  subhead: z.string().max(400),
  blocks: z.array(z.record(z.string(), z.unknown())).default([]),
});

export const seoSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().max(320),
  ogImage: z.string().max(500),
  robots: z.string().max(120),
  canonical: z.string().max(500),
  jsonLd: z.string().max(20000),
});

export const aiSettingsSchema = z.object({
  endpoint: z.string().url(),
  model: z.string().min(1),
  apiKey: z.string(),
});

export const emailSettingsSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  resendApiKey: z.string(),
});

export const localeSettingsSchema = z.object({
  default: z.string().min(2).max(10),
  supported: z.array(z.string().min(2).max(10)).min(1),
});

export const translateSchema = z.object({
  text: z.string().min(1).max(20000),
  targetLocale: z.string().min(2).max(10),
  sourceLocale: z.string().min(2).max(10).optional(),
});

export const geoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().max(200).optional(),
  userId: z.string().uuid().optional(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const draftKeySchema = z.enum(["slideshow", "home", "seo"]);
