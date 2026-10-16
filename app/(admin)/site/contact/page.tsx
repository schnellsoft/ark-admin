import { ContactManager } from "@/components/contact-manager";
import { getContactSettings } from "@/lib/contact";

export default async function ContactPage() {
  const contact = await getContactSettings();
  return <ContactManager initial={contact} />;
}
