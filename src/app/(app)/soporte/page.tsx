import { getTickets } from "@/app/actions/soporte";
import { SoporteList } from "@/components/soporte/SoporteList";

export default async function SoportePage() {
  const result = await getTickets();
  return <SoporteList initialTickets={(result.tickets ?? []) as any[]} />;
}
