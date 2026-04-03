/**
 * Branded email templates for Livio.
 * All emails use inline CSS for maximum compatibility across email clients.
 */

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ─── Shared Layout ──────────────────────────────────────────

function emailLayout(content: string, preheader: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
<!-- Logo -->
<tr><td align="center" style="padding:40px 40px 24px;">
<span style="font-size:32px;font-weight:700;color:#1E293B;letter-spacing:2px;">LI<span style="color:#2DD4A8;">V</span>IO</span>
</td></tr>
${content}
<!-- Footer -->
<tr><td style="padding:24px 40px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1E293B;letter-spacing:1px;">LI<span style="color:#2DD4A8;">V</span>IO</p>
<p style="margin:0 0 4px;font-size:12px;color:#94A3B8;">Gestión dental potenciada con IA</p>
<p style="margin:0 0 12px;font-size:12px;"><a href="https://liviodental.com" style="color:#2DD4A8;text-decoration:none;">liviodental.com</a></p>
<p style="margin:0;font-size:11px;color:#CBD5E1;line-height:1.4;">Si no realizaste esta acción, podés ignorar este email de forma segura.</p>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function ctaButton(text: string, url: string): string {
    return `<tr><td align="center" style="padding:8px 40px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td align="center" style="border-radius:8px;background-color:#2DD4A8;">
<a href="${url}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#2DD4A8;">
${escapeHtml(text)}
</a></td></tr></table>
</td></tr>`;
}

// ─── Verification Email ─────────────────────────────────────

export function verificationEmailHTML(userName: string, clinicName: string, url: string): string {
    const safeName = escapeHtml(userName);
    const safeClinic = escapeHtml(clinicName);

    return emailLayout(`
<!-- Icon -->
<tr><td align="center" style="padding:0 40px 16px;">
<div style="width:64px;height:64px;background-color:#ECFDF5;border-radius:50%;line-height:64px;text-align:center;font-size:28px;">✉️</div>
</td></tr>
<!-- Title -->
<tr><td align="center" style="padding:0 40px 8px;">
<h1 style="margin:0;font-size:24px;font-weight:700;color:#1E293B;">¡Registro exitoso!</h1>
</td></tr>
<tr><td align="center" style="padding:0 40px 24px;">
<p style="margin:0;font-size:16px;color:#64748B;">Confirmá tu email para activar tu cuenta</p>
</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid #E2E8F0;"></div></td></tr>
<!-- Body -->
<tr><td style="padding:24px 40px 8px;">
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Hola <strong style="color:#1E293B;">${safeName}</strong>,</p>
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Tu cuenta para <strong style="color:#1E293B;">${safeClinic}</strong> fue creada correctamente. Para empezar a usar Livio, confirmá tu email haciendo click en el botón:</p>
</td></tr>
${ctaButton("Confirmar mi cuenta", url)}
<!-- Trial info -->
<tr><td style="padding:0 40px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0FDFA;border-radius:8px;border:1px solid #CCFBF1;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0F766E;">🎉 Tu prueba gratuita de 30 días ya está activa</p>
<p style="margin:0;font-size:13px;color:#5EEAD4;">Sin tarjeta de crédito · Cancelá cuando quieras</p>
</td></tr></table>
</td></tr>
<!-- Fallback link -->
<tr><td style="padding:0 40px 24px;">
<p style="margin:0;font-size:13px;color:#94A3B8;">Si el botón no funciona, copiá y pegá este link:</p>
<p style="margin:8px 0 0;font-size:12px;color:#2DD4A8;word-break:break-all;">${url}</p>
</td></tr>
<tr><td style="padding:0 40px 32px;">
<p style="margin:0;font-size:13px;color:#94A3B8;">⏰ Este link expira en <strong>24 horas</strong>.</p>
</td></tr>`,
        "¡Tu cuenta en Livio fue creada! Solo falta confirmar tu email para empezar."
    );
}

export function verificationEmailText(userName: string, clinicName: string, url: string): string {
    return `¡Registro exitoso en Livio!

Hola ${userName},

Tu cuenta para ${clinicName} fue creada correctamente.

Para empezar a usar Livio, confirmá tu email visitando este link:

${url}

🎉 Tu prueba gratuita de 30 días ya está activa
Sin tarjeta de crédito · Cancelá cuando quieras

⏰ Este link expira en 24 horas.

---
Livio — Gestión dental potenciada con IA
https://liviodental.com`;
}

// ─── Welcome Email (post-verification) ──────────────────────

export function welcomeEmailHTML(userName: string): string {
    const safeName = escapeHtml(userName);
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://liviodental.com";

    return emailLayout(`
<tr><td align="center" style="padding:0 40px 16px;">
<div style="width:64px;height:64px;background-color:#ECFDF5;border-radius:50%;line-height:64px;text-align:center;font-size:28px;">🎉</div>
</td></tr>
<tr><td align="center" style="padding:0 40px 8px;">
<h1 style="margin:0;font-size:24px;font-weight:700;color:#1E293B;">¡Bienvenido a Livio!</h1>
</td></tr>
<tr><td align="center" style="padding:0 40px 24px;">
<p style="margin:0;font-size:16px;color:#64748B;">Tu clínica está lista para empezar</p>
</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid #E2E8F0;"></div></td></tr>
<tr><td style="padding:24px 40px 8px;">
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Hola <strong>${safeName}</strong>,</p>
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Tu email fue verificado. Estos son los primeros pasos para sacarle el máximo provecho a Livio:</p>
</td></tr>
<tr><td style="padding:0 40px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td style="padding:8px 0;font-size:14px;color:#334155;"><strong style="color:#2DD4A8;">1.</strong> Completá los datos de tu clínica</td></tr>
<tr><td style="padding:8px 0;font-size:14px;color:#334155;"><strong style="color:#2DD4A8;">2.</strong> Configurá tu agenda y horarios</td></tr>
<tr><td style="padding:8px 0;font-size:14px;color:#334155;"><strong style="color:#2DD4A8;">3.</strong> Agregá a tu equipo</td></tr>
</table>
</td></tr>
${ctaButton("Ir a mi dashboard", `${appUrl}/dashboard`)}`,
        "¡Tu email fue verificado! Tu clínica está lista para empezar."
    );
}

// ─── Lockout Alert Email ─────────────────────────────────────

export function lockoutAlertHTML(ip: string): string {
    const safeIp = escapeHtml(ip);
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://liviodental.com"}/forgot-password`;

    return emailLayout(`
<tr><td align="center" style="padding:0 40px 16px;">
<div style="width:64px;height:64px;background-color:#FEF2F2;border-radius:50%;line-height:64px;text-align:center;font-size:28px;">🔒</div>
</td></tr>
<tr><td align="center" style="padding:0 40px 8px;">
<h1 style="margin:0;font-size:24px;font-weight:700;color:#1E293B;">Alerta de seguridad</h1>
</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid #E2E8F0;"></div></td></tr>
<tr><td style="padding:24px 40px 8px;">
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Detectamos múltiples intentos de acceso fallidos a tu cuenta.</p>
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;"><strong>IP origen:</strong> ${safeIp}<br><strong>Hora:</strong> ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Tu cuenta fue bloqueada temporalmente por 15 minutos. Si fuiste vos, esperá e intentá de nuevo. Si no fuiste vos, cambiá tu contraseña:</p>
</td></tr>
${ctaButton("Cambiar mi contraseña", resetUrl)}`,
        "Detectamos intentos de acceso a tu cuenta de Livio"
    );
}

// ─── Password Reset Email ────────────────────────────────────

export function passwordResetHTML(userName: string, resetUrl: string): string {
    const safeName = escapeHtml(userName);

    return emailLayout(`
<tr><td align="center" style="padding:0 40px 16px;">
<div style="width:64px;height:64px;background-color:#EFF6FF;border-radius:50%;line-height:64px;text-align:center;font-size:28px;">🔑</div>
</td></tr>
<tr><td align="center" style="padding:0 40px 8px;">
<h1 style="margin:0;font-size:24px;font-weight:700;color:#1E293B;">Restablecé tu contraseña</h1>
</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid #E2E8F0;"></div></td></tr>
<tr><td style="padding:24px 40px 8px;">
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Hola <strong>${safeName}</strong>,</p>
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Recibimos una solicitud para restablecer tu contraseña. Hacé click en el botón para elegir una nueva:</p>
</td></tr>
${ctaButton("Restablecer contraseña", resetUrl)}
<tr><td style="padding:0 40px 24px;">
<p style="margin:0;font-size:13px;color:#94A3B8;">Si el botón no funciona, copiá este link:</p>
<p style="margin:8px 0 0;font-size:12px;color:#2DD4A8;word-break:break-all;">${resetUrl}</p>
</td></tr>
<tr><td style="padding:0 40px 32px;">
<p style="margin:0;font-size:13px;color:#94A3B8;">⏰ Este link expira en <strong>1 hora</strong>. Si no solicitaste este cambio, ignorá este email.</p>
</td></tr>`,
        "Recibimos tu solicitud para restablecer la contraseña de Livio"
    );
}

// ─── Password Changed Confirmation ──────────────────────────

export function passwordChangedHTML(userName: string): string {
    const safeName = escapeHtml(userName);
    const supportUrl = `mailto:soporte@liviodental.com`;

    return emailLayout(`
<tr><td align="center" style="padding:0 40px 16px;">
<div style="width:64px;height:64px;background-color:#ECFDF5;border-radius:50%;line-height:64px;text-align:center;font-size:28px;">✅</div>
</td></tr>
<tr><td align="center" style="padding:0 40px 8px;">
<h1 style="margin:0;font-size:24px;font-weight:700;color:#1E293B;">Contraseña actualizada</h1>
</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid #E2E8F0;"></div></td></tr>
<tr><td style="padding:24px 40px 8px;">
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Hola <strong>${safeName}</strong>,</p>
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Tu contraseña de Livio fue cambiada exitosamente el ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}.</p>
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Si no hiciste este cambio, contactanos inmediatamente:</p>
</td></tr>
${ctaButton("Contactar soporte", supportUrl)}`,
        "Tu contraseña de Livio fue actualizada"
    );
}

// ─── Email Provider Detection ────────────────────────────────

export function getEmailProviderUrl(email: string): string | null {
    const domain = email.split("@")[1]?.toLowerCase();
    const providers: Record<string, string> = {
        "gmail.com": "https://mail.google.com",
        "googlemail.com": "https://mail.google.com",
        "hotmail.com": "https://outlook.live.com",
        "hotmail.com.ar": "https://outlook.live.com",
        "outlook.com": "https://outlook.live.com",
        "outlook.com.ar": "https://outlook.live.com",
        "live.com": "https://outlook.live.com",
        "live.com.ar": "https://outlook.live.com",
        "yahoo.com": "https://mail.yahoo.com",
        "yahoo.com.ar": "https://mail.yahoo.com",
        "icloud.com": "https://www.icloud.com/mail",
    };
    return providers[domain] || null;
}

// ─── Support Ticket Notification (internal — Livio receives) ─

export function supportTicketNotificationHTML(
    ticketId: string,
    subject: string,
    category: string,
    priority: string,
    message: string,
    clinicName: string,
    userName: string,
    userEmail: string,
): string {
    const safeSubject = escapeHtml(subject);
    const safeCategory = escapeHtml(category);
    const safePriority = escapeHtml(priority);
    const safeMessage = escapeHtml(message);
    const safeClinic = escapeHtml(clinicName);
    const safeName = escapeHtml(userName);
    const safeEmail = escapeHtml(userEmail);
    const shortId = escapeHtml(ticketId.slice(0, 8));
    const priorityColor = priority.toLowerCase() === "urgente" ? "#DC2626" : "#6B7280";

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
<!-- Header -->
<tr><td style="background-color:#1F2429;padding:32px 40px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#82D9BC;letter-spacing:0.5px;">Nuevo Ticket de Soporte</h1>
<p style="margin:8px 0 0;font-size:14px;color:#94A3B8;">${safeSubject}</p>
</td></tr>
<!-- Data table -->
<tr><td style="padding:32px 40px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
<tr>
  <td style="padding:10px 16px 10px 0;font-size:13px;font-weight:600;color:#64748B;white-space:nowrap;vertical-align:top;">Ticket ID</td>
  <td style="padding:10px 0;font-size:13px;color:#1E293B;font-family:monospace;">#${shortId}</td>
</tr>
<tr style="background-color:#F8FAFC;">
  <td style="padding:10px 16px 10px 0;font-size:13px;font-weight:600;color:#64748B;white-space:nowrap;vertical-align:top;">Clínica</td>
  <td style="padding:10px 0;font-size:13px;color:#1E293B;">${safeClinic}</td>
</tr>
<tr>
  <td style="padding:10px 16px 10px 0;font-size:13px;font-weight:600;color:#64748B;white-space:nowrap;vertical-align:top;">Usuario</td>
  <td style="padding:10px 0;font-size:13px;color:#1E293B;">${safeName}</td>
</tr>
<tr style="background-color:#F8FAFC;">
  <td style="padding:10px 16px 10px 0;font-size:13px;font-weight:600;color:#64748B;white-space:nowrap;vertical-align:top;">Email</td>
  <td style="padding:10px 0;font-size:13px;color:#1E293B;">${safeEmail}</td>
</tr>
<tr>
  <td style="padding:10px 16px 10px 0;font-size:13px;font-weight:600;color:#64748B;white-space:nowrap;vertical-align:top;">Categoría</td>
  <td style="padding:10px 0;font-size:13px;color:#1E293B;">${safeCategory}</td>
</tr>
<tr style="background-color:#F8FAFC;">
  <td style="padding:10px 16px 10px 0;font-size:13px;font-weight:600;color:#64748B;white-space:nowrap;vertical-align:top;">Prioridad</td>
  <td style="padding:10px 0;font-size:13px;font-weight:600;color:${priorityColor};">${safePriority}</td>
</tr>
</table>
</td></tr>
<!-- Message block -->
<tr><td style="padding:0 40px 32px;">
<p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Mensaje</p>
<div style="background-color:#f1f5f9;border-radius:8px;padding:20px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${safeMessage}</div>
</td></tr>
<!-- Footer -->
<tr><td style="padding:20px 40px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
<p style="margin:0;font-size:12px;color:#94A3B8;">Para responder este ticket, ingresá al panel de Supabase o al backoffice de Livio.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function supportTicketNotificationText(
    ticketId: string,
    subject: string,
    category: string,
    priority: string,
    message: string,
    clinicName: string,
    userName: string,
    userEmail: string,
): string {
    return `NUEVO TICKET DE SOPORTE — Livio
================================

Ticket ID:  #${ticketId.slice(0, 8)}
Asunto:     ${subject}
Clínica:    ${clinicName}
Usuario:    ${userName}
Email:      ${userEmail}
Categoría:  ${category}
Prioridad:  ${priority}

MENSAJE
-------
${message}

---
Para responder este ticket, ingresá al panel de Supabase o al backoffice de Livio.`;
}

// ─── Support Ticket Reply (outbound — clinic receives) ───────

export function supportTicketReplyHTML(
    userName: string,
    subject: string,
    replyMessage: string,
    ticketUrl: string,
): string {
    const safeName = escapeHtml(userName);
    const safeSubject = escapeHtml(subject);
    const safeReply = escapeHtml(replyMessage);
    const logoUrl = "https://bjyqvqrtlahaiixicook.supabase.co/storage/v1/object/public/branding/logo-dark.png";

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
<!-- Header -->
<tr><td align="center" style="background-color:#1F2429;padding:32px 40px;">
<img src="${logoUrl}" alt="Livio" width="120" height="auto" style="display:block;border:0;" />
</td></tr>
<!-- Body -->
<tr><td style="padding:32px 40px 24px;">
<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Hola <strong style="color:#1E293B;">${safeName}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">Tenemos una respuesta para tu consulta: <strong style="color:#1E293B;">${safeSubject}</strong></p>
<!-- Reply block -->
<div style="border-left:4px solid #82D9BC;background-color:#f0fdf4;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:28px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${safeReply}</div>
<!-- CTA button -->
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td align="center" style="border-radius:8px;background-color:#82D9BC;">
<a href="${ticketUrl}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:600;color:#1F2429;text-decoration:none;border-radius:8px;">
Ver en Livio
</a>
</td></tr></table>
</td></tr></table>
</td></tr>
<!-- Footer -->
<tr><td style="padding:24px 40px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
<p style="margin:0 0 8px;font-size:13px;color:#64748B;line-height:1.5;">Si necesitas mas ayuda, responde este email o escribinos desde la app.</p>
<p style="margin:0;font-size:12px;"><a href="https://liviodental.com" style="color:#82D9BC;text-decoration:none;">liviodental.com</a></p>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function supportTicketReplyText(
    userName: string,
    subject: string,
    replyMessage: string,
    ticketUrl: string,
): string {
    return `Hola ${userName},

Tenemos una respuesta para tu consulta: ${subject}

---
${replyMessage}
---

Para ver el ticket completo: ${ticketUrl}

Si necesitas mas ayuda, responde este email o escribinos desde la app.

---
Livio — Gestión dental potenciada con IA
https://liviodental.com`;
}

// ─── Email Masking ───────────────────────────────────────────

export function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${"*".repeat(local.length - 2)}${local.slice(-1)}@${domain}`;
}
