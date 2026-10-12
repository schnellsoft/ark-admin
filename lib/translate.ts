import { DEFAULT_AI_SETTINGS } from "./ai-defaults";
import { getSetting } from "./content";

type AiSettings = {
  endpoint: string;
  model: string;
  apiKey: string;
};

/** Map admin locales to Cloudflare m2m100 language ids (ISO-ish / English names both accepted). */
const LOCALE_TO_CF_LANG: Record<string, string> = {
  en: "en",
  ro: "ro",
  bg: "bg",
  english: "en",
  romanian: "ro",
  bulgarian: "bg",
};

function toCfLang(locale: string | undefined, fallback: string): string {
  if (!locale) return fallback;
  const key = locale.trim().toLowerCase();
  return LOCALE_TO_CF_LANG[key] ?? key;
}

/** Normalize stored endpoint to the Cloudflare account API root. */
function cloudflareAccountBase(endpoint: string): string {
  return endpoint
    .replace(/\/$/, "")
    .replace(/\/ai\/v1\/chat\/completions$/i, "")
    .replace(/\/ai\/v1$/i, "")
    .replace(/\/ai\/run\/.*$/i, "")
    .replace(/\/ai\/run$/i, "");
}

function isCloudflareEndpoint(endpoint: string): boolean {
  return /api\.cloudflare\.com/i.test(endpoint);
}

function isCfTranslationModel(model: string): boolean {
  return /m2m100|translation/i.test(model);
}

function formatCfError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const errors = (body as { errors?: Array<{ message?: string }> }).errors;
  if (Array.isArray(errors) && errors[0]?.message) return errors[0].message;
  return fallback;
}

async function translateWithCloudflareRun(
  settings: AiSettings,
  input: { text: string; targetLocale: string; sourceLocale?: string },
) {
  const base = cloudflareAccountBase(settings.endpoint);
  const model = settings.model || DEFAULT_AI_SETTINGS.model;
  const url = `${base}/ai/run/${model}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: input.text,
      source_lang: toCfLang(input.sourceLocale, "en"),
      target_lang: toCfLang(input.targetLocale, "en"),
    }),
  });

  const data = (await res.json()) as {
    success?: boolean;
    result?: { translated_text?: string };
    translated_text?: string;
    errors?: Array<{ message?: string }>;
  };

  if (!res.ok || data.success === false) {
    return {
      ok: false as const,
      error: formatCfError(data, `Cloudflare AI error (${res.status})`),
    };
  }

  const translated = (data.result?.translated_text ?? data.translated_text)?.trim();
  if (!translated) {
    return { ok: false as const, error: "Empty translation response" };
  }
  return { ok: true as const, translated };
}

async function translateWithChatCompletions(
  settings: AiSettings,
  input: { text: string; targetLocale: string; sourceLocale?: string },
) {
  const endpoint = settings.endpoint.replace(/\/$/, "");
  const chatBase = /\/ai\/v1$/i.test(endpoint)
    ? endpoint
    : isCloudflareEndpoint(endpoint)
      ? `${cloudflareAccountBase(endpoint)}/ai/v1`
      : endpoint;

  const res = await fetch(`${chatBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: "system",
          content:
            "You are a precise translator for a dental clinic admin. Return only the translated text.",
        },
        {
          role: "user",
          content: `Translate the following${input.sourceLocale ? ` from ${input.sourceLocale}` : ""} to ${input.targetLocale}:\n\n${input.text}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    return { ok: false as const, error: await res.text() };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const translated = data.choices?.[0]?.message?.content?.trim();
  if (!translated) {
    return { ok: false as const, error: "Empty translation response" };
  }
  return { ok: true as const, translated };
}

export async function translateText(input: {
  text: string;
  targetLocale: string;
  sourceLocale?: string;
}) {
  const settings = (await getSetting<AiSettings>("ai")) ?? { ...DEFAULT_AI_SETTINGS };

  if (!settings.apiKey) {
    return { ok: false as const, error: "Configure an AI API key in Site Settings." };
  }

  const text = input.text.trim();
  if (!text) {
    return { ok: false as const, error: "Nothing to translate" };
  }

  const model = settings.model?.trim() || DEFAULT_AI_SETTINGS.model;
  const resolved = { ...settings, model };

  // Cloudflare Workers AI: translation models use /ai/run; chat models use /ai/v1/chat/completions.
  if (isCloudflareEndpoint(resolved.endpoint) || model.startsWith("@cf/")) {
    if (isCfTranslationModel(model)) {
      return translateWithCloudflareRun(resolved, { ...input, text });
    }
    return translateWithChatCompletions(resolved, { ...input, text });
  }

  return translateWithChatCompletions(resolved, { ...input, text });
}
