"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import SoporteNewTicketModal from "./SoporteNewTicketModal";

export default function SoporteFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const sourceModule = pathname
    .replace(/^\//, "")
    .split("/")[0] || "dashboard";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-accent text-slate-900 dark:text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        title="¿Necesitás ayuda?"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </button>

      <SoporteNewTicketModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        sourceModule={sourceModule}
      />
    </>
  );
}
