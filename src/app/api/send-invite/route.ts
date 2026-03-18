export const dynamic = "force-dynamic";

import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'
  );
  const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

  try {
    const body = await request.json();
    console.log('📬 [API] Payload recibido:', body);
    const { email, role, clinicId, clinicName, inviterName, inviterId, invitedName } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email y rol son requeridos.' },
        { status: 400 }
      );
    }

    // 1. Check for existing pending invite
    if (clinicId) {
      const { data: existing } = await supabaseAdmin
        .from('invites')
        .select('id')
        .eq('email', email)
        .eq('clinic_id', clinicId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'Ya existe una invitación pendiente para este email.' },
          { status: 409 }
        );
      }

      // Check max 10 pending per clinic
      const { count } = await supabaseAdmin
        .from('invites')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('status', 'pending');

      if (count && count >= 10) {
        return NextResponse.json(
          { error: 'Máximo 10 invitaciones pendientes por clínica.' },
          { status: 429 }
        );
      }
    }

    // 2. Generate invite token and insert into DB
    const token = crypto.randomUUID();
    // Ensure production origin always uses custom domain, unless localhost
    let origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://liviodental.com';
    if (origin.includes('vercel.app')) {
      origin = 'https://liviodental.com';
    }
    const inviteLink = `${origin}/accept-invite/${token}`;

    const { error: insertError } = await supabaseAdmin.from('invites').insert({
      clinic_id: clinicId || null,
      email,
      role,
      invited_name: invitedName || null,
      inviter_id: inviterId || null,
      inviter_name: inviterName || 'Livio',
      status: 'pending',
      token,
    });

    if (insertError) {
      console.error('Insert invite error:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // 3. Get role display name
    const roleNames: Record<string, string> = {
      superadmin: 'Dueño / Admin',
      recepcionista: 'Recepcionista',
      profesional: 'Profesional Odontólogo',
    };
    const roleName = roleNames[role] || role;

    // 4. Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Livio <onboarding@resend.dev>',
      to: email,
      subject: `¡${inviterName || 'Tu clínica'} te invitó a Livio!`,
      html: buildInviteEmailHtml({
        inviterName: inviterName || 'Livio',
        invitedName: invitedName || 'Colega',
        clinicName: clinicName || 'Tu Clínica',
        roleName,
        inviteLink,
      }),
    });

    if (emailError) {
      console.error('Resend email error:', emailError);
      // Still return success since invite is in DB
      return NextResponse.json({
        success: true,
        warning: 'Invitación creada pero el email no se pudo enviar.',
      });
    }

    console.log('✅ Invite email sent:', emailData?.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send invite error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// ─── HTML Escaping ────────────────────────────────────────────────
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── HTML Email Template ─────────────────────────────────────────
function buildInviteEmailHtml({
  inviterName,
  invitedName,
  clinicName,
  roleName,
  inviteLink,
}: {
  inviterName: string;
  invitedName: string;
  clinicName: string;
  roleName: string;
  inviteLink: string;
}) {
  // Escape all user-supplied values before embedding in HTML
  inviterName = escapeHtml(inviterName);
  invitedName = escapeHtml(invitedName);
  clinicName = escapeHtml(clinicName);
  roleName = escapeHtml(roleName);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  // Fallback to a publicly hosted logo if on localhost, otherwise the local one
  const logoUrl = origin.includes('localhost')
    ? 'https://raw.githubusercontent.com/nexioartificial/livio/main/public/logo.png'
    : `${origin}/logo.png`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invitación a Livio</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background-color:#ffffff;padding:48px 40px 12px;text-align:center;">
              <img src="${logoUrl}" alt="Livio Logo" style="height:70px;width:auto;display:inline-block;margin:0 auto;" />
              <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;">Software Dental Inteligente</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:24px;font-weight:800;letter-spacing:-0.5px;text-align:center;">¡Hola, ${invitedName}! 👋</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:16px;line-height:1.6;text-align:center;">
                <strong style="color:#0f172a;">${inviterName}</strong> de <strong style="color:#0f172a;">${clinicName}</strong> te ha invitado a unirte a su equipo en la plataforma Livio.
              </p>

              <!-- Role Info Card -->
              <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:24px;margin-bottom:32px;text-align:center;">
                <p style="margin:0;color:#166534;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                  Tu posición asignada:
                </p>
                <h3 style="margin:10px 0 0;color:#10B981;font-size:22px;font-weight:800;">
                  ✨ ${roleName}
                </h3>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" target="_blank"
                       style="display:inline-block;background-color:#10B981;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:18px 48px;border-radius:14px;box-shadow:0 8px 20px rgba(16,185,129,0.25);">
                      Aceptar invitación →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="margin-top:40px;padding-top:24px;border-top:1px solid #f1f5f9;">
                <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                  Este enlace es exclusivo y personal.<br/>
                  Si no esperabas este correo, podés ignorarlo.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
                Livio 🇦🇷 — Software con IA para clínicas odontológicas<br/>
                Cumplimiento Ley 27.706 · Datos protegidos
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
