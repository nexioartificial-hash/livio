"use client";

import { Plus } from "lucide-react";
import InviteModal from "./InviteModal";

interface AddMemberFABProps {
    onInviteSent?: () => void;
}

export function AddMemberFAB({ onInviteSent }: AddMemberFABProps) {
    return (
        <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <InviteModal
                onInviteSent={onInviteSent}
                trigger={
                    <button 
                        className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#10B981] text-white shadow-lg shadow-[#10B981]/40 transition-all hover:scale-110 hover:bg-[#059669] active:scale-95"
                        title="Agregar Miembro"
                    >
                        <Plus className="h-7 w-7 transition-transform group-hover:rotate-90" />
                    </button>
                }
            />
        </div>
    );
}
