import { SiteSectionEditor } from "@/components/site-section-editor";
import { getDraft } from "@/lib/content";

export default async function HeaderIconsPage() {
  const draft = (await getDraft<{ facebook: string; instagram: string; phone: string }>(
    "header-icons",
  )) ?? {
    facebook: "",
    instagram: "",
    phone: "",
  };

  return (
    <SiteSectionEditor
      title="Header · Icons"
      description="Social and contact icons shown in the site header."
      draftKey="header-icons"
      initial={draft}
      fields={[
        { name: "facebook", label: "Facebook URL", placeholder: "https://", raw: true },
        { name: "instagram", label: "Instagram URL", placeholder: "https://", raw: true },
        { name: "phone", label: "Phone link", placeholder: "tel:+40...", raw: true },
      ]}
    />
  );
}
