/**
 * GET /api/cron/reminders
 *
 * Enviá recordatorios de turno 24h antes.
 * Vercel llama este endpoint según el schedule en vercel.json.
 *
 * Estrategia:
 * 1. Si la clínica tiene WhatsApp activo y el paciente tiene teléfono → WhatsApp
 * 2. Si el paciente tiene email → Resend (fallback)
 * 3. Sin contacto → skip
 *
 * Seguridad: verifica el header Authorization con CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBotMessage } from "@/lib/whatsapp/send-bot-message";
import { Resend } from "resend";
import { DateTime } from "luxon";

const TIMEZONE = "America/Argentina/Buenos_Aires";

export async function GET(request: NextRequest) {
  // Verificar que la llamada viene de Vercel Cron (o un trigger autorizado)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const tomorrow = DateTime.now()
    .setZone(TIMEZONE)
    .plus({ days: 1 })
    .toISODate();

  if (!tomorrow) {
    return NextResponse.json(
      { error: "No se pudo calcular la fecha de mañana" },
      { status: 500 }
    );
  }

  // Buscar turnos de mañana que no fueron recordados y están activos
  const { data: turnos, error: turnosError } = await supabase
    .from("turno")
    .select(
      "id, date, time, patient_name, professional_name, reason, patient_id, clinic_id, status"
    )
    .eq("date", tomorrow)
    .eq("reminder_sent", false)
    .in("status", ["pendiente", "confirmado"]);

  if (turnosError) {
    console.error("[Reminders] Error fetching turnos:", turnosError.message);
    return NextResponse.json(
      { error: turnosError.message },
      { status: 500 }
    );
  }

  if (!turnos || turnos.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const turno of turnos) {
    try {
      // Obtener datos de contacto del paciente
      const { data: patient } = await supabase
        .from("patient")
        .select("phone, email, full_name")
        .eq("id", turno.patient_id)
        .single();

      if (!patient) {
        console.warn(`[Reminders] Paciente no encontrado para turno ${turno.id}`);
        continue;
      }

      const timeFormatted = turno.time?.substring(0, 5) ?? "";
      const dateFormatted = DateTime.fromISO(turno.date, { zone: TIMEZONE })
        .setLocale("es")
        .toLocaleString({
          weekday: "long",
          day: "numeric",
          month: "long",
        });

      const patientName: string = patient.full_name ?? turno.patient_name;

      // ── Canal 1: WhatsApp ──────────────────────────────────────────────
      if (turno.clinic_id && patient.phone) {
        const { data: waConn } = await supabase
          .from("user_whatsapps")
          .select("phone_id, access_token")
          .eq("clinic_id", turno.clinic_id)
          .eq("status", "active")
          .limit(1)
          .single();

        if (waConn?.phone_id && waConn.access_token) {
          const messageLines: string[] = [
            `Hola ${patientName}! Te recordamos tu turno:`,
            `Fecha: ${dateFormatted}`,
            `Hora: ${timeFormatted}hs`,
          ];

          if (turno.professional_name) {
            messageLines.push(`Profesional: ${turno.professional_name}`);
          }
          if (turno.reason) {
            messageLines.push(`Motivo: ${turno.reason}`);
          }

          messageLines.push(
            "\nSi necesitas cancelar o reprogramar, respondé a este mensaje."
          );

          const message = messageLines.join("\n");

          // Normalizar número a formato internacional Argentina (54 + número)
          const rawPhone = patient.phone.replace(/\D/g, "");
          const waPhone = rawPhone.startsWith("54") ? rawPhone : `54${rawPhone}`;

          const result = await sendBotMessage(
            waConn.phone_id,
            waPhone,
            message,
            waConn.access_token,
            turno.clinic_id
          );

          if (!result.success) {
            throw new Error(result.error ?? "WhatsApp send failed");
          }

          await supabase
            .from("turno")
            .update({ reminder_sent: true })
            .eq("id", turno.id);

          sent++;
          continue;
        }
      }

      // ── Canal 2: Email (fallback) ──────────────────────────────────────
      if (patient.email) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmail =
          process.env.RESEND_FROM_EMAIL ?? "Livio <recordatorios@liviodental.com>";

        const professionalRow = turno.professional_name
          ? `<p><strong>Profesional:</strong> ${turno.professional_name}</p>`
          : "";
        const reasonRow = turno.reason
          ? `<p><strong>Motivo:</strong> ${turno.reason}</p>`
          : "";

        const { error: emailError } = await resend.emails.send({
          from: fromEmail,
          to: patient.email,
          subject: `Recordatorio de turno — ${dateFormatted} a las ${timeFormatted}hs`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1F2429;">
              <h2 style="color: #1F2429;">Recordatorio de turno</h2>
              <p>Hola ${patientName},</p>
              <p>Te recordamos que tenés un turno programado:</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p><strong>Fecha:</strong> ${dateFormatted}</p>
                <p><strong>Hora:</strong> ${timeFormatted}hs</p>
                ${professionalRow}
                ${reasonRow}
              </div>
              <p style="color: #666; font-size: 14px;">
                Si necesitás cancelar o reprogramar, contactanos respondiendo este email.
              </p>
            </div>
          `,
        });

        if (emailError) {
          throw new Error(emailError.message);
        }

        await supabase
          .from("turno")
          .update({ reminder_sent: true })
          .eq("id", turno.id);

        sent++;
        continue;
      }

      // Sin canal disponible → skip silencioso
      console.warn(
        `[Reminders] Turno ${turno.id}: paciente sin teléfono ni email, skip`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Reminders] Error en turno ${turno.id}:`, message);
      failed++;
    }
  }

  console.log(
    `[Reminders] Completado — enviados: ${sent}, fallidos: ${failed}, total: ${turnos.length}`
  );

  return NextResponse.json({ sent, failed, total: turnos.length });
}
