import { getSetting } from "./content";

type AiSettings = {
  endpoint: string;
  model: string;
  apiKey: string;
};

export async function translateText(input: {
  text: string;
  targetLocale: string;
  sourceLocale?: string;
}) {
  const settings = (await getSetting<AiSettings>("ai")) ?? {
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKey: "",
  };

  if (!settings.apiKey) {
    return { ok: false as const, error: "Configure an AI API key in Site Settings." };
  }

  const endpoint = settings.endpoint.replace(/\/$/, "");
  const res = await fetch(`${endpoint}/chat/completions`, {
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
