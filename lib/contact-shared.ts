export const CONTACT_CONTENT_KEY = "contact/contact.json";

export type ContactSettings = {
  phone: string;
  email: string;
};

export type ContactDocument = {
  phone: string;
  email: string;
  updatedAt: string;
};

export function emptyContactSettings(): ContactSettings {
  return { phone: "", email: "" };
}

export function validateContactSettings(
  draft: Partial<ContactSettings>,
): string | null {
  const email = (draft.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Invalid email address";
  }
  return null;
}
