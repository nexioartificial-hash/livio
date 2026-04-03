import { getTicketMessages } from "@/app/actions/soporte";
import SoporteChat from "@/components/soporte/SoporteChat";
import { redirect } from "next/navigation";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const result = await getTicketMessages(ticketId);

  if (!result.success || !result.ticket) {
    redirect("/soporte");
  }

  return (
    <SoporteChat
      ticket={result.ticket}
      initialMessages={result.messages}
    />
  );
}
