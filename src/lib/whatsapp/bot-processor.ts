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
 * Main bot processor. Called from the webhook when an inbound message arrives.
 *
 * Flow:
 * 1. Load bot context (config, clinic data, patient, conversation history)
 * 2. Check if bot is enabled and within active hours
 * 3. Send message to Gemini with tools
 * 4. Send response back via WhatsApp
 */
export async function processInboundMessage(
  clinicId: string,
  phoneId: string,
  fromNumber: string,
  messageBody: string
): Promise<void> {
  const admin = createAdminClient();

  try {
    // 1. Build context
    const ctx = await buildBotContext(admin, clinicId, phoneId, fromNumber);

    if (!ctx) {
      console.log(
        "[Bot] No context (bot disabled or no connection) for",
        phoneId
      );
      return;
    }

    // 2. Check hours
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

    // 3. Build system prompt and call Gemini
    const systemPrompt = buildSystemPrompt(ctx.clinicContext);

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

    // 4. Send response via WhatsApp
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
