import { getEnv } from "./env";
import {
  CONTACT_CONTENT_KEY,
  emptyContactSettings,
  validateContactSettings,
  type ContactDocument,
  type ContactSettings,
} from "./contact-shared";

type ContactDb = {
  phone: string;
  email: string;
};

async function ensureRow() {
  const { SITE_DB } = getEnv();
  await SITE_DB.prepare(
    `INSERT OR IGNORE INTO contact_settings (id) VALUES (1)`,
  ).run();
}

export async function getContactSettings(): Promise<ContactSettings> {
  const { SITE_DB } = getEnv();
  await ensureRow();
  const row = await SITE_DB.prepare(
    `SELECT phone, email FROM contact_settings WHERE id = 1`,
  ).first<ContactDb>();

  if (!row) return emptyContactSettings();
  return {
    phone: row.phone ?? "",
    email: row.email ?? "",
  };
}

export async function saveContactSettings(
  input: ContactSettings,
): Promise<ContactSettings> {
  const error = validateContactSettings(input);
  if (error) throw new Error(error);

  const { SITE_DB } = getEnv();
  await ensureRow();

  const next: ContactSettings = {
    phone: input.phone.trim(),
    email: input.email.trim(),
  };

  await SITE_DB.prepare(
    `UPDATE contact_settings SET
       phone = ?,
       email = ?,
       updated_at = datetime('now')
     WHERE id = 1`,
  )
    .bind(next.phone, next.email)
    .run();

  await publishContact();
  return getContactSettings();
}

export async function buildContactDocument(): Promise<ContactDocument> {
  const contact = await getContactSettings();
  return {
    phone: contact.phone,
    email: contact.email,
    updatedAt: new Date().toISOString(),
  };
}

export async function publishContact(): Promise<void> {
  const { CONTENT } = getEnv();
  const doc = await buildContactDocument();
  await CONTENT.put(CONTACT_CONTENT_KEY, JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}
