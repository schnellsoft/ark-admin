import { listIcons } from "@/lib/icons";
import { IconsPageClient } from "@/components/icons-page-client";

export default async function IconsPage() {
  const icons = await listIcons();
  return <IconsPageClient initial={icons} />;
}
