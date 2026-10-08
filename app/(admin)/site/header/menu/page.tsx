import { getDraft } from "@/lib/content";
import { MenuListManager } from "@/components/menu-list-manager";

export default async function HeaderMenuPage() {
  const draft = (await getDraft("header-menu")) ?? {
    items: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        position: 1,
        label: { ro: "Acasă", bg: "Начало", en: "Home" },
        href: "/",
      },
    ],
  };

  return <MenuListManager initialDraft={draft} />;
}
