import { ScheduleManager } from "@/components/schedule-manager";
import { getScheduleDays } from "@/lib/schedule";

export default async function SchedulePage() {
  const days = await getScheduleDays();
  return <ScheduleManager initialDays={days} />;
}
