/**
 * Sends a WhatsApp text message from the bot (no user session needed).
 * Uses the access_token from user_whatsapps directly.
 */

import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function sendBotMessage(
  phoneId: string,
  to: string,
  text: string,
  accessToken: string,
  clinicId: string | null
): Promise<{ success: boolean; wamid?: string; error?: string }> {
  const cleanTo = to.replace(/\D/g, "");

  const metaPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "text",
    text: { body: text, preview_url: false },
  };

  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaPayload),
    });

    const data = await res.json();

    if (data.error) {
      console.error("[Bot Send] Meta error:", data.error);
      return { success: false, error: data.error.message };
    }

    const wamid: string = data.messages?.[0]?.id ?? "";

    // Save outbound message
    const admin = createAdminClient();
    await admin.from("whatsapp_messages").insert({
      clinic_id: clinicId,
      phone_id: phoneId,
      wamid,
      direction: "outbound",
      from_number: phoneId,
      to_number: cleanTo,
      type: "text",
      body: text,
      status: "sent",
      timestamp: new Date().toISOString(),
      raw_payload: data,
    });

    return { success: true, wamid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Bot Send] Error:", message);
    return { success: false, error: message };
  }
}
