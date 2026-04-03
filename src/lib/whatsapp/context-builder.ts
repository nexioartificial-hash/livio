import { type SupabaseClient } from "@supabase/supabase-js";
import { type Content } from "@google/generative-ai";
import { type ClinicContext } from "./system-prompt";

// A session is considered expired after 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export interface UpcomingAppointment {
  date: string;
  time: string;
  professional: string;
  reason: string;
}

export interface BotContext {
  clinicContext: ClinicContext;
  patientId: string | null;
  patientName: string | null;
  conversationHistory: Content[];
  accessToken: string;
  sessionId: string;
  sessionSummaries: string[];
  upcomingAppointments: UpcomingAppointment[];
  botConfig: {
    enabled: boolean;
    greeting_message: string;
    out_of_hours_message: string;
    bot_hours_start: string;
    bot_hours_end: string;
    bot_active_days: number[];
    system_prompt_extra: string | null;
  };
  // Internal flags — used by bot-processor, not exposed to Gemini
  _needsSummarization: boolean;
  _sessionToSummarize: string | null;
}

/**
 * Loads all context needed for the bot to process a message.
 * Handles session lifecycle: create, continue, or rotate expired sessions.
 */
export async function buildBotContext(
  admin: SupabaseClient,
  clinicId: string,
  phoneId: string,
  fromNumber: string
): Promise<BotContext | null> {
  // 1. Get WhatsApp connection (access token) and bot config in parallel
  const cleanFrom = fromNumber.replace(/\D/g, "");

  const [connResult, botConfigResult] = await Promise.all([
    admin
      .from("user_whatsapps")
      .select("access_token")
      .eq("clinic_id", clinicId)
      .eq("phone_id", phoneId)
      .eq("status", "active")
      .single(),
    admin
      .from("whatsapp_bot_config")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("phone_id", phoneId)
      .single(),
  ]);

  if (!connResult.data?.access_token) {
    console.log("[Context] No active connection for", phoneId);
    return null;
  }

  if (!botConfigResult.data || !botConfigResult.data.enabled) {
    console.log("[Context] Bot disabled for", phoneId);
    return null;
  }

  const conn = connResult.data;
  const botConfig = botConfigResult.data;

  // 2. Load clinic, professionals, patient, and active session in parallel
  const [clinicResult, professionalsResult, patientResult, activeSessionResult] =
    await Promise.all([
      admin
        .from("clinic")
        .select("name, phone, email, email_clinic")
        .eq("id", clinicId)
        .single(),
      admin
        .from("professional")
        .select("full_name, specialty")
        .eq("clinic_id", clinicId),
      admin
        .from("patient")
        .select("id, full_name")
        .eq("clinic_id", clinicId)
        .eq("phone", cleanFrom)
        .limit(1)
        .single(),
      admin
        .from("conversation_sessions")
        .select("id, started_at, last_message_at, message_count, patient_id")
        .eq("clinic_id", clinicId)
        .eq("phone_id", phoneId)
        .eq("patient_phone", cleanFrom)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

  const clinic = clinicResult.data;
  const professionals = professionalsResult.data ?? [];
  const patient = patientResult.data ?? null;
  const activeSession = activeSessionResult.data ?? null;

  // 3. Session management
  let sessionId: string;
  let sessionStartedAt: string;
  let needsSummarization = false;
  let sessionToSummarize: string | null = null;

  const now = new Date();

  if (activeSession) {
    const lastMessageAt = new Date(activeSession.last_message_at);
    const gapMs = now.getTime() - lastMessageAt.getTime();

    if (gapMs > SESSION_TIMEOUT_MS) {
      // Session expired — rotate: close old, create new
      console.log(
        "[Context] Session expired (gap:",
        Math.round(gapMs / 60000),
        "min). Rotating."
      );

      needsSummarization = true;
      sessionToSummarize = activeSession.id;

      // Mark old session as closed
      await admin
        .from("conversation_sessions")
        .update({ status: "closed" })
        .eq("id", activeSession.id);

      // Create new session
      const { data: newSession } = await admin
        .from("conversation_sessions")
        .insert({
          clinic_id: clinicId,
          phone_id: phoneId,
          patient_phone: cleanFrom,
          patient_id: patient?.id ?? null,
          started_at: now.toISOString(),
          last_message_at: now.toISOString(),
          message_count: 1,
          status: "active",
        })
        .select("id, started_at")
        .single();

      sessionId = newSession?.id ?? crypto.randomUUID();
      sessionStartedAt = newSession?.started_at ?? now.toISOString();
    } else {
      // Continue existing session
      await admin
        .from("conversation_sessions")
        .update({
          last_message_at: now.toISOString(),
          message_count: (activeSession.message_count ?? 0) + 1,
          // Update patient_id if we just identified the patient
          ...(patient?.id && !activeSession.patient_id
            ? { patient_id: patient.id }
            : {}),
        })
        .eq("id", activeSession.id);

      sessionId = activeSession.id;
      sessionStartedAt = activeSession.started_at;
    }
  } else {
    // No active session — create one
    const { data: newSession } = await admin
      .from("conversation_sessions")
      .insert({
        clinic_id: clinicId,
        phone_id: phoneId,
        patient_phone: cleanFrom,
        patient_id: patient?.id ?? null,
        started_at: now.toISOString(),
        last_message_at: now.toISOString(),
        message_count: 1,
        status: "active",
      })
      .select("id, started_at")
      .single();

    sessionId = newSession?.id ?? crypto.randomUUID();
    sessionStartedAt = newSession?.started_at ?? now.toISOString();
  }

  // 4. Load messages from current session only (up to 50)
  const { data: sessionMessages } = await admin
    .from("whatsapp_messages")
    .select("direction, body, timestamp")
    .eq("clinic_id", clinicId)
    .eq("phone_id", phoneId)
    .or(`from_number.eq.${fromNumber},to_number.eq.${cleanFrom}`)
    .gte("timestamp", sessionStartedAt)
    .not("body", "is", null)
    .order("timestamp", { ascending: true })
    .limit(50);

  const conversationHistory: Content[] = (sessionMessages ?? [])
    .filter((m) => m.body)
    .map((m) => ({
      role: (m.direction === "inbound" ? "user" : "model") as "user" | "model",
      parts: [{ text: m.body as string }],
    }));

  // 5. Load last 3 closed session summaries (chronological order)
  const { data: closedSessions } = await admin
    .from("conversation_sessions")
    .select("summary, last_message_at")
    .eq("clinic_id", clinicId)
    .eq("patient_phone", cleanFrom)
    .eq("status", "closed")
    .not("summary", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(3);

  // Reverse to get chronological order (oldest → newest)
  const sessionSummaries: string[] = ((closedSessions ?? []) as { summary: string | null; last_message_at: string }[])
    .reverse()
    .map((s) => s.summary)
    .filter((s): s is string => s !== null);

  // 6. Load upcoming appointments for this patient
  const upcomingAppointments: UpcomingAppointment[] = [];

  if (patient?.id) {
    const today = now.toISOString().split("T")[0];
    const { data: turnos } = await admin
      .from("turno")
      .select(
        "fecha, hora, motivo, professional:professional_id(full_name)"
      )
      .eq("clinic_id", clinicId)
      .eq("patient_id", patient.id)
      .gte("fecha", today)
      .in("estado", ["pendiente", "confirmado"])
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true })
      .limit(5);

    for (const t of turnos ?? []) {
      const prof = t.professional as unknown as { full_name: string | null } | null;
      upcomingAppointments.push({
        date: t.fecha as string,
        time: (t.hora as string).slice(0, 5), // HH:MM
        professional: prof?.full_name ?? "Profesional",
        reason: (t.motivo as string | null) ?? "Consulta",
      });
    }
  }

  return {
    clinicContext: {
      clinicName: clinic?.name ?? "Clínica",
      clinicPhone: clinic?.phone ?? null,
      clinicEmail: clinic?.email_clinic ?? clinic?.email ?? null,
      professionals: professionals.map((p) => ({
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
    sessionId,
    sessionSummaries,
    upcomingAppointments,
    botConfig: {
      enabled: botConfig.enabled,
      greeting_message: botConfig.greeting_message,
      out_of_hours_message: botConfig.out_of_hours_message,
      bot_hours_start: botConfig.bot_hours_start,
      bot_hours_end: botConfig.bot_hours_end,
      bot_active_days: botConfig.bot_active_days,
      system_prompt_extra: botConfig.system_prompt_extra,
    },
    _needsSummarization: needsSummarization,
    _sessionToSummarize: sessionToSummarize,
  };
}
