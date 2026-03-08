import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteRequest {
  email: string;
  role: string;
  clinicId: string;
  inviterName: string;
  inviterId: string;
  sucursales?: string[];
  name?: string;
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Extract authorization header (Auth token of the user making the request)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Admin Client to bypass RLS for invite creation
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token securely
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse request payload
    const payload: InviteRequest = await req.json();
    const { email, role, clinicId, inviterName, inviterId, sucursales, name } = payload;

    if (!email || !role || !clinicId) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, role, clinicId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if the inviter is the actual authenticated user (security check)
    if (user.id !== inviterId) {
       return new Response(JSON.stringify({ error: "Forbidden: inviterId mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Verify no pending invites exist for this email in this clinic
    const { data: existingInvite } = await supabaseAdmin
      .from("invites")
      .select("id")
      .eq("email", email)
      .eq("clinic_id", clinicId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      return new Response(JSON.stringify({ error: "Ya existe una invitación pendiente para este email" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate max 10 pending
    const { count } = await supabaseAdmin
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("status", "pending");

    if (count && count >= 10) {
      return new Response(JSON.stringify({ error: "Límite de 10 invitaciones pendientes alcanzado" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Generate secure token & Insert into DB
    const token = crypto.randomUUID();
    
    // We expect the app hosted URL, fallback to liviodental.com or localhost
    const originUrl = req.headers.get("origin") || req.headers.get("referer") || "https://liviodental.com";
    const cleanOrigin = originUrl.endsWith('/') ? originUrl.slice(0, -1) : originUrl;
    
    // Create base link
    const inviteLink = `${cleanOrigin}/accept-invite/${token}`;

    const { error: insertError } = await supabaseAdmin.from("invites").insert({
      clinic_id: clinicId,
      email: email,
      role: role,
      inviter_id: inviterId,
      inviter_name: inviterName,
      status: "pending",
      token: token,
      metadata: {
          sucursales: sucursales || [],
          name: name || null
      }
    });

    if (insertError) {
      throw insertError;
    }

    // 6. Define Roles display
    const roleNames: Record<string, string> = {
      superadmin: "Dueño / Admin",
      recepcionista: "Recepcionista",
      profesional: "Profesional Odontólogo",
    };
    const displayRole = roleNames[role] || role;

    // 7. Send Email via Resend using global Deno.env.get
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
        console.error("Missing RESEND_API_KEY environment variable. Invite saved to DB, email not sent.");
        return new Response(JSON.stringify({ 
            success: true, 
            warning: "Invitación creada pero no se pudo enviar el correo porque falta configurar RESEND API KEY en Edge Functions" 
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const htmlContent = buildEmailHtml(inviterName, displayRole, inviteLink);

    const resendReq = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Livio <livio@liviodental.com>",
        to: email,
        subject: `¡${inviterName} te invitó a Livio!`,
        html: htmlContent,
      }),
    });

    const resendRes = await resendReq.json();

    if (!resendReq.ok) {
      console.error("Resend API error:", resendRes);
      return new Response(JSON.stringify({ 
          success: true, 
          warning: "Invitación creada, pero ocurrió un error al enviar el email." 
      }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Invite sent successfully:", email);

    return new Response(JSON.stringify({ success: true, id: resendRes.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildEmailHtml(inviterName: string, roleName: string, inviteLink: string) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invitación a Livio</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.06);width:100%;max-width:500px;border:1px solid #f1f5f9;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 32px 32px;background:linear-gradient(145deg, #0f172a 0%, #1e293b 100%);">
              <img src="https://liviodental.com/logo-transparent.png" alt="Livio" width="160" style="display:block;margin:0 auto;height:auto;" />
              <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;letter-spacing:2px;font-weight:600;">GESTIÓN DENTAL INTELIGENTE</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:24px;font-weight:800;letter-spacing:-0.5px;text-align:center;">
                ¡Tenés una invitación!
              </h2>
              <p style="margin:0 0 32px;color:#64748b;font-size:16px;line-height:1.6;text-align:center;">
                <strong style="color:#0f172a;">${inviterName}</strong> te ha invitado a sumarte a su equipo en Livio.
              </p>

              <!-- Role Info Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ecfdf5;border-radius:16px;margin-bottom:32px;border:1px solid #d1fae5;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;color:#065f46;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                      Tu rol asignado
                    </p>
                    <p style="margin:8px 0 0;color:#10b981;font-size:18px;font-weight:800;">
                      ${roleName}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" target="_blank"
                       style="display:inline-block;background-color:#10B981;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 40px;border-radius:99px;box-shadow:0 8px 20px rgba(16,185,129,0.25);">
                      Aceptar Invitación
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;color:#94a3b8;font-size:13px;text-align:center;line-height:1.6;">
                Este enlace es seguro y expirará en 24 horas.<br/>
                Si no esperabas esto, podés ignorar el mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
