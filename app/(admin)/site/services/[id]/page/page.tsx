import { notFound } from "next/navigation";
import { ServicePageEditor } from "@/components/service-page-editor";
import { getService, getServicePage } from "@/lib/services";

type Props = { params: Promise<{ id: string }> };

export default async function ServicePageEditPage({ params }: Props) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();
  const page = await getServicePage(id);
  return <ServicePageEditor service={service} initialPage={page} />;
}
