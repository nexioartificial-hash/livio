import { GoogleGenerativeAI } from "@google/generative-ai";
import { type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBotContext } from "./context-builder";
import { buildSystemPrompt } from "./system-prompt";
import { chatWithGemini } from "./ai-client";
import { sendBotMessage } from "./send-bot-message";
import { type ToolContext } from "./tools";

/**
 * Checks if the current time falls within the bot's active hours and days.
 * Uses Argentina timezone (UTC-3).
 */
function isWithinBotHours(config: {
  bot_hours_start: string;
  bot_hours_end: string;
  bot_active_days: number[];
}): boolean {
  const now = new Date();
  // Argentina timezone (UTC-3)
  const argTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const day = argTime.getDay(); // 0=Sunday, 1=Monday...
  const hours = argTime.getHours();
  const minutes = argTime.getMinutes();
  const currentTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  if (!config.bot_active_days.includes(day)) return false;
  if (currentTime < config.bot_hours_start) return false;
  if (currentTime >= config.bot_hours_end) return false;

  return true;
}

/**
 * Generates a 2-3 sentence summary of a closed conversation session
 * and persists it. Called fire-and-forget after session rotation.
 */
async function summarizeSession(
  admin: SupabaseClient,
  sessionId: string,
  clinicId: string,
  phoneId: string,
  patientPhone: string,
  sessionStartedAt: string
): Promise<void> {
  try {
    // Load messages from the closed session
    const cleanPhone = patientPhone.replace(/\D/g, "");
    const { data: messages } = await admin
      .from("whatsapp_messages")
      .select("direction, body, timestamp")
      .eq("clinic_id", clinicId)
      .eq("phone_id", phoneId)
      .or(`from_number.eq.${patientPhone},to_number.eq.${cleanPhone}`)
      .gte("timestamp", sessionStartedAt)
      .not("body", "is", null)
      .order("timestamp", { ascending: true })
      .limit(50);

    const filtered = (messages ?? []).filter((m) => m.body);

    if (filtered.length < 2) {
      // Not enough content to summarize — just mark closed
      await admin
        .from("conversation_sessions")
        .update({ status: "closed" })
        .eq("id", sessionId);
      return;
    }

    // Build transcript
    const transcript = filtered
      .map((m) => {
        const role = m.direction === "inbound" ? "Paciente" : "Bot";
        return `${role}: ${m.body as string}`;
      })
      .join("\n");

    // Call Gemini to summarize
    const apiKey = process.env.GOOGLE_AI_API_KEY ?? "";
    if (!apiKey) {
      console.warn("[Summarize] GOOGLE_AI_API_KEY not set, skipping summary");
      await admin
        .from("conversation_sessions")
        .update({ status: "closed" })
        .eq("id", sessionId);
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Resumí esta conversación de WhatsApp entre un paciente y el bot de una clínica dental en 2-3 oraciones. Incluí: qué quería el paciente, qué se resolvió (si se sacó un turno, cuándo y con quién), y cualquier dato relevante. Sé conciso y usá tercera persona.

Conversación:
${transcript}

Resumen:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    if (summary) {
      await admin
        .from("conversation_sessions")
        .update({ status: "closed", summary })
        .eq("id", sessionId);
      console.log("[Summarize] Session", sessionId, "summarized successfully");
    } else {
      await admin
        .from("conversation_sessions")
        .update({ status: "closed" })
        .eq("id", sessionId);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Summarize] Failed to summarize session", sessionId, ":", message);
    // Even on failure, ensure session is marked closed
    try {
      await admin
        .from("conversation_sessions")
        .update({ status: "closed" })
        .eq("id", sessionId);
    } catch {
      // Ignore secondary failure
    }
  }
}

/**
 * Main bot processor. Called from the webhook when an inbound message arrives.
 *
 * Flow:
 * 1. Load bot context (config, clinic data, patient, conversation history, session)
 * 2. Fire-and-forget session summarization if session was rotated
 * 3. Check if bot is enabled and within active hours
 * 4. Send message to Gemini with tools
 * 5. Send response back via WhatsApp
 */
export async function processInboundMessage(
  clinicId: string,
  phoneId: string,
  fromNumber: string,
  messageBody: string
): Promise<void> {
  const admin = createAdminClient();

  try {
    // 1. Build context (handles session lifecycle internally)
    const ctx = await buildBotContext(admin, clinicId, phoneId, fromNumber);

    if (!ctx) {
      console.log(
        "[Bot] No context (bot disabled or no connection) for",
        phoneId
      );
      return;
    }

    // 2. Fire-and-forget: summarize the previous session if it was rotated
    if (ctx._needsSummarization && ctx._sessionToSummarize) {
      const sessionIdToSummarize = ctx._sessionToSummarize;
      const cleanPhone = fromNumber.replace(/\D/g, "");

      // Wrap in async IIFE to avoid PromiseLike.catch() type issues
      void (async () => {
        try {
          const { data } = await admin
            .from("conversation_sessions")
            .select("started_at")
            .eq("id", sessionIdToSummarize)
            .single();

          if (data?.started_at) {
            await summarizeSession(
              admin,
              sessionIdToSummarize,
              clinicId,
              phoneId,
              cleanPhone,
              data.started_at
            );
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("[Bot] Background summarization failed:", message);
        }
      })();
    }

    // 3. Check hours
    if (!isWithinBotHours(ctx.botConfig)) {
      console.log("[Bot] Outside bot hours for", phoneId);
      await sendBotMessage(
        phoneId,
        fromNumber,
        ctx.botConfig.out_of_hours_message,
        ctx.accessToken,
        clinicId
      );
      return;
    }

    // 4. Build system prompt (now includes session memory and upcoming appointments)
    const systemPrompt = buildSystemPrompt(
      ctx.clinicContext,
      ctx.sessionSummaries,
      ctx.upcomingAppointments
    );

    const toolCtx: ToolContext = {
      admin,
      clinicId,
      patientId: ctx.patientId,
      patientName: ctx.patientName,
      fromNumber,
    };

    const aiResponse = await chatWithGemini(
      systemPrompt,
      ctx.conversationHistory,
      messageBody,
      toolCtx
    );

    // 5. Send response via WhatsApp
    await sendBotMessage(
      phoneId,
      fromNumber,
      aiResponse,
      ctx.accessToken,
      clinicId
    );

    console.log("[Bot] Responded to", fromNumber, "via", phoneId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Bot] Error processing message:", message);

    // Try to send fallback message
    try {
      const { data: conn } = await admin
        .from("user_whatsapps")
        .select("access_token")
        .eq("clinic_id", clinicId)
        .eq("phone_id", phoneId)
        .single();

      if (conn?.access_token) {
        await sendBotMessage(
          phoneId,
          fromNumber,
          "Disculpá, no pude procesar tu mensaje. Intentá de nuevo en unos minutos.",
          conn.access_token,
          clinicId
        );
      }
    } catch {
      console.error("[Bot] Failed to send fallback message");
    }
  }
}
