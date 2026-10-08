import { SiteSectionEditor } from "@/components/site-section-editor";
import { getDraft } from "@/lib/content";

export default async function HeaderLogoPage() {
  const draft = (await getDraft<{ logoKey: string; alt: string }>("header-logo")) ?? {
    logoKey: "",
    alt: "Ark Dental",
  };

  return (
    <SiteSectionEditor
      title="Header · Logo"
      description="Logo image key on R2 and alt text for the clinic header."
      draftKey="header-logo"
      initial={draft}
      fields={[
        { name: "logoKey", label: "Logo R2 key", placeholder: "media/logo.svg", raw: true },
        { name: "alt", label: "Alt text", placeholder: "Ark Dental" },
      ]}
    />
  );
}
