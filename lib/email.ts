import { getSetting } from "./content";

type EmailSettings = {
  to: string;
  from: string;
  resendApiKey: string;
};

export async function sendContactEmail(input: {
  name: string;
  email: string;
  message: string;
  phone?: string;
}) {
  const settings = (await getSetting<EmailSettings>("email")) ?? {
    to: "admin@ark.local",
    from: "noreply@ark.local",
    resendApiKey: "",
  };

  if (!settings.resendApiKey) {
    return { sent: false, reason: "missing_resend_api_key" as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: settings.from,
      to: [settings.to],
      subject: `Ark contact: ${input.name}`,
      text: `From: ${input.name} <${input.email}>\nPhone: ${input.phone ?? "—"}\n\n${input.message}`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { sent: false, reason: "provider_error" as const, detail };
  }

  return { sent: true as const };
}
