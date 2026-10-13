import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/content";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  locale: z.string().default("ro"),
  price: z.string().optional(),
  currency: z.string().optional(),
});

/**
 * Best-effort page stub via Cloudflare Workers AI chat when configured;
 * otherwise returns a deterministic clinical stub in the requested locale.
 */
export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { title, locale, price, currency } = parsed.data;
    const fee = [price, currency].filter(Boolean).join(" ");

    const stubRo = [
      `${title} este un serviciu clinic precis. Tariful publicat este ${fee || "—"}.`,
      `Indicația se stabilește după examen clinic, radiografii la nevoie și evaluarea riscurilor medicale.`,
      `Secvența include izolarea, controlul durerii și pașii tehnici specifici, urmați de indicații post-operatorii.`,
    ].join("\n\n");

    const stubEn = [
      `${title} is a defined clinical service. The published fee is ${fee || "—"}.`,
      `Indication is established after clinical examination, imaging when needed, and medical risk assessment.`,
      `The sequence includes isolation, pain control and the specific technical steps, followed by aftercare instructions.`,
    ].join("\n\n");

    const stubBg = [
      `${title} е точно определен клиничен протокол. Обявената такса е ${fee || "—"}.`,
      `Показанието се поставя след оглед, образно изследване при нужда и оценка на медицинския риск.`,
      `Последователността включва изолация, обезболяване и специфичните стъпки, последвани от следоперативни указания.`,
    ].join("\n\n");

    let text =
      locale === "en" ? stubEn : locale === "bg" ? stubBg : stubRo;

    try {
      const ai = (await getSetting("ai")) as {
        endpoint?: string;
        model?: string;
        apiKey?: string;
      } | null;
      if (ai?.apiKey && ai.endpoint && /cloudflare/i.test(ai.endpoint)) {
        const base = ai.endpoint
          .replace(/\/$/, "")
          .replace(/\/ai\/v1\/chat\/completions$/i, "")
          .replace(/\/ai\/v1$/i, "")
          .replace(/\/ai\/run\/.*$/i, "")
          .replace(/\/ai\/run$/i, "");
        const model = ai.model?.includes("m2m100")
          ? "@cf/meta/llama-3.1-8b-instruct"
          : ai.model || "@cf/meta/llama-3.1-8b-instruct";
        const res = await fetch(`${base}/ai/run/${model}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ai.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "You write short professional dental clinic service page copy. Output 3 paragraphs separated by blank lines. No markdown.",
              },
              {
                role: "user",
                content: `Locale: ${locale}. Service: ${title}. Fee: ${fee || "n/a"}.`,
              },
            ],
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            result?: { response?: string };
            response?: string;
          };
          const out = data.result?.response || data.response;
          if (out?.trim()) text = out.trim();
        }
      }
    } catch {
      // keep stub
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
