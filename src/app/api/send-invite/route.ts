import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { email, role, clinicId, inviterName, inviterId } = await request.json();

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
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const inviteLink = `${origin}/accept-invite/${token}`;

    const { error: insertError } = await supabaseAdmin.from('invites').insert({
      clinic_id: clinicId || null,
      email,
      role,
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
        inviterName: inviterName || 'Tu clínica',
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

// ─── HTML Email Template ─────────────────────────────────────────
function buildInviteEmailHtml({
  inviterName,
  roleName,
  inviteLink,
}: {
  inviterName: string;
  roleName: string;
  inviteLink: string;
}) {
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
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">LIVIO</h1>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;letter-spacing:1px;">SOFTWARE ODONTOLÓGICO CON IA</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">¡Te invitaron al equipo!</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                <strong style="color:#0f172a;">${inviterName}</strong> te invitó a unirte como
                <strong style="color:#10B981;">${roleName}</strong> en Livio.
              </p>

              <!-- Role Badge -->
              <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0;color:#166534;font-size:13px;font-weight:600;">
                  🦷 Tu rol: ${roleName}
                </p>
                <p style="margin:4px 0 0;color:#15803d;font-size:12px;">
                  Tendrás acceso completo a las funciones de tu rol
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" target="_blank"
                       style="display:inline-block;background-color:#10B981;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:12px;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                      Aceptar invitación →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.5;">
                Este enlace es válido por 24 horas.<br/>
                Si no esperabas esta invitación, podés ignorar este email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
                Livio — Software con IA para clínicas odontológicas 🇦🇷<br/>
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
