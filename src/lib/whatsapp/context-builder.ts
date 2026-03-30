import { type SupabaseClient } from "@supabase/supabase-js";
import { type Content } from "@google/generative-ai";
import { type ClinicContext } from "./system-prompt";

export interface BotContext {
  clinicContext: ClinicContext;
  patientId: string | null;
  patientName: string | null;
  conversationHistory: Content[];
  accessToken: string;
  botConfig: {
    enabled: boolean;
    greeting_message: string;
    out_of_hours_message: string;
    bot_hours_start: string;
    bot_hours_end: string;
    bot_active_days: number[];
    system_prompt_extra: string | null;
  };
}

/**
 * Loads all context needed for the bot to process a message.
 */
export async function buildBotContext(
  admin: SupabaseClient,
  clinicId: string,
  phoneId: string,
  fromNumber: string
): Promise<BotContext | null> {
  // 1. Get WhatsApp connection (access token)
  const { data: conn } = await admin
    .from("user_whatsapps")
    .select("access_token")
    .eq("clinic_id", clinicId)
    .eq("phone_id", phoneId)
    .eq("status", "active")
    .single();

  if (!conn?.access_token) {
    console.log("[Context] No active connection for", phoneId);
    return null;
  }

  // 2. Get bot config
  const { data: botConfig } = await admin
    .from("whatsapp_bot_config")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("phone_id", phoneId)
    .single();

  if (!botConfig || !botConfig.enabled) {
    console.log("[Context] Bot disabled for", phoneId);
    return null;
  }

  // 3. Get clinic info
  const { data: clinic } = await admin
    .from("clinic")
    .select("name, phone, email, email_clinic")
    .eq("id", clinicId)
    .single();

  // 4. Get professionals
  const { data: professionals } = await admin
    .from("professional")
    .select("full_name, specialty")
    .eq("clinic_id", clinicId);

  // 5. Find patient by phone number
  const cleanFrom = fromNumber.replace(/\D/g, "");
  const { data: patient } = await admin
    .from("patient")
    .select("id, full_name")
    .eq("clinic_id", clinicId)
    .eq("phone", cleanFrom)
    .limit(1)
    .single();

  // 6. Load recent conversation history (last 10 messages)
  const { data: recentMessages } = await admin
    .from("whatsapp_messages")
    .select("direction, body, timestamp")
    .eq("clinic_id", clinicId)
    .eq("phone_id", phoneId)
    .or(`from_number.eq.${fromNumber},to_number.eq.${cleanFrom}`)
    .not("body", "is", null)
    .order("timestamp", { ascending: true })
    .limit(10);

  // Convert to Gemini conversation format
  const conversationHistory: Content[] = (recentMessages ?? [])
    .filter((m) => m.body)
    .map((m) => ({
      role: (m.direction === "inbound" ? "user" : "model") as "user" | "model",
      parts: [{ text: m.body as string }],
    }));

  return {
    clinicContext: {
      clinicName: clinic?.name ?? "Clínica",
      clinicPhone: clinic?.phone ?? null,
      clinicEmail: clinic?.email_clinic ?? clinic?.email ?? null,
      professionals: (professionals ?? []).map((p) => ({
        name: p.full_name ?? "Sin nombre",
        specialty: p.specialty,
      })),
      patientName: patient?.full_name ?? null,
      isNewPatient: !patient,
      extraInstructions: botConfig.system_prompt_extra,
    },
    patientId: patient?.id ?? null,
    patientName: patient?.full_name ?? null,
    conversationHistory,
    accessToken: conn.access_token,
    botConfig: {
      enabled: botConfig.enabled,
      greeting_message: botConfig.greeting_message,
      out_of_hours_message: botConfig.out_of_hours_message,
      bot_hours_start: botConfig.bot_hours_start,
      bot_hours_end: botConfig.bot_hours_end,
      bot_active_days: botConfig.bot_active_days,
      system_prompt_extra: botConfig.system_prompt_extra,
    },
  };
}
