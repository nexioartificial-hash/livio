# WhatsApp Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an autonomous WhatsApp bot that uses Gemini 2.0 Flash with tool calling to handle patient interactions (appointments, info, registration) integrated with Livio's clinic data.

**Architecture:** Webhook receives inbound WhatsApp messages → bot-processor orchestrates the flow → context-builder loads clinic data from Supabase → Gemini Flash with 8 tools generates responses and executes actions → response sent back via WhatsApp API.

**Tech Stack:** Next.js 16 API routes, Supabase (PostgreSQL + admin client), Google Generative AI SDK (`@google/generative-ai`), Meta WhatsApp Business API v21.0

---

## Key Context

**Existing code that we build on:**
- `src/app/api/webhooks/whatsapp/route.ts` — receives Meta webhooks, saves messages to `whatsapp_messages`, resolves `clinic_id` from `phone_id` via `user_whatsapps` table
- `src/app/api/whatsapp/send/route.ts` — sends messages via Meta Graph API, requires user session + phone_id ownership
- `src/app/api/auth/whatsapp/callback/route.ts` — OAuth callback, exchanges code for tokens, discovers WABA, saves to `user_whatsapps`
- `src/lib/supabase/admin.ts` — admin client that bypasses RLS (use for bot operations)
- `src/app/(app)/config/page.tsx` — config page with tabs: clinica, equipo, tratamientos, obras-sociales, inventario, integraciones

**Database note:** The `database.types.ts` is out of date — the actual DB has `user_whatsapps` and `tratamientos` tables (added via migrations) but they're not in the types file. All bot code uses the admin client with raw queries (no TypeScript types needed). There's also an existing `bot_config` table with fields `clinic_data, clinica_id, hours, quick_replies, style_guide, tone` — we will NOT use this old table. We create a new `whatsapp_bot_config` table with the fields we need.

**Environment variable needed:** `GOOGLE_AI_API_KEY` — free from https://aistudio.google.com/apikey

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/whatsapp/ai-client.ts` | Gemini Flash wrapper with tool calling loop |
| Create | `src/lib/whatsapp/system-prompt.ts` | Generates system prompt per clinic |
| Create | `src/lib/whatsapp/context-builder.ts` | Loads clinic data from Supabase |
| Create | `src/lib/whatsapp/bot-processor.ts` | Orchestrator: message in → AI → action → response out |
| Create | `src/lib/whatsapp/send-bot-message.ts` | Sends WhatsApp message using admin client (no user session) |
| Create | `src/lib/whatsapp/tools/index.ts` | Tool definitions + executor map |
| Create | `src/lib/whatsapp/tools/consultar-disponibilidad.ts` | Query available appointment slots |
| Create | `src/lib/whatsapp/tools/agendar-turno.ts` | Book an appointment |
| Create | `src/lib/whatsapp/tools/cancelar-turno.ts` | Cancel an appointment |
| Create | `src/lib/whatsapp/tools/reprogramar-turno.ts` | Reschedule an appointment |
| Create | `src/lib/whatsapp/tools/mis-turnos.ts` | List patient's upcoming appointments |
| Create | `src/lib/whatsapp/tools/info-clinica.ts` | Return clinic info |
| Create | `src/lib/whatsapp/tools/info-tratamientos.ts` | Return treatments with prices |
| Create | `src/lib/whatsapp/tools/registrar-paciente.ts` | Register new patient |
| Create | `supabase/migrations/20260330_whatsapp_bot_config.sql` | New table for bot configuration |
| Create | `src/components/config/WhatsAppBotTab.tsx` | Bot config UI component |
| Modify | `src/app/api/webhooks/whatsapp/route.ts` | Add bot-processor call after saving inbound message |
| Modify | `src/app/api/auth/whatsapp/callback/route.ts` | Create default bot_config after connecting |
| Modify | `src/app/(app)/config/page.tsx` | Add "WhatsApp Bot" tab |

---

### Task 1: Install dependency and create migration

**Files:**
- Modify: `package.json`
- Create: `supabase/migrations/20260330_whatsapp_bot_config.sql`

- [ ] **Step 1: Install Google Generative AI SDK**

```bash
cd "C:/Users/Noxi-PC/Desktop/Archivos Livio/livio" && npm install @google/generative-ai
```

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/20260330_whatsapp_bot_config.sql`:

```sql
-- WhatsApp Bot Configuration per clinic
CREATE TABLE IF NOT EXISTS whatsapp_bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinic(id) ON DELETE CASCADE,
  phone_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  greeting_message TEXT DEFAULT '¡Hola! Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte?',
  out_of_hours_message TEXT DEFAULT 'Gracias por escribirnos. Estamos fuera del horario de atención. Te responderemos a la brevedad.',
  bot_hours_start TIME DEFAULT '08:00',
  bot_hours_end TIME DEFAULT '20:00',
  bot_active_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
  ai_model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  system_prompt_extra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, phone_id)
);

ALTER TABLE whatsapp_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_can_read_bot_config" ON whatsapp_bot_config
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM professional WHERE user_id = auth.uid())
  );

CREATE POLICY "clinic_members_can_manage_bot_config" ON whatsapp_bot_config
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM professional WHERE user_id = auth.uid() AND role = 'superadmin')
  );
```

- [ ] **Step 3: Run the migration in Supabase**

Run the SQL in the Supabase dashboard SQL editor (or via `supabase db push` if CLI is configured).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json supabase/migrations/20260330_whatsapp_bot_config.sql
git commit -m "feat(whatsapp): add @google/generative-ai and bot_config migration"
```

---

### Task 2: Create send-bot-message helper

The existing `/api/whatsapp/send` requires a user session. The bot needs to send messages from a webhook context (no user session). This helper sends messages directly using the admin client.

**Files:**
- Create: `src/lib/whatsapp/send-bot-message.ts`

- [ ] **Step 1: Create the helper**

Create `src/lib/whatsapp/send-bot-message.ts`:

```typescript
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
  } catch (err: any) {
    console.error("[Bot Send] Error:", err.message);
    return { success: false, error: err.message };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/whatsapp/send-bot-message.ts
git commit -m "feat(whatsapp): add send-bot-message helper for bot responses"
```

---

### Task 3: Create tool definitions and executors

Each tool has a Gemini function declaration (schema) and an executor function that runs against Supabase.

**Files:**
- Create: `src/lib/whatsapp/tools/consultar-disponibilidad.ts`
- Create: `src/lib/whatsapp/tools/agendar-turno.ts`
- Create: `src/lib/whatsapp/tools/cancelar-turno.ts`
- Create: `src/lib/whatsapp/tools/reprogramar-turno.ts`
- Create: `src/lib/whatsapp/tools/mis-turnos.ts`
- Create: `src/lib/whatsapp/tools/info-clinica.ts`
- Create: `src/lib/whatsapp/tools/info-tratamientos.ts`
- Create: `src/lib/whatsapp/tools/registrar-paciente.ts`
- Create: `src/lib/whatsapp/tools/index.ts`

- [ ] **Step 1: Create consultar-disponibilidad.ts**

Create `src/lib/whatsapp/tools/consultar-disponibilidad.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";

export const consultarDisponibilidadDeclaration = {
  name: "consultar_disponibilidad",
  description:
    "Consulta los horarios disponibles para un turno en una fecha específica. " +
    "Devuelve una lista de slots libres con horario y profesional.",
  parameters: {
    type: "object" as const,
    properties: {
      fecha: {
        type: "string",
        description: "Fecha a consultar en formato YYYY-MM-DD",
      },
      profesional: {
        type: "string",
        description: "Nombre del profesional (opcional, si el paciente tiene preferencia)",
      },
    },
    required: ["fecha"],
  },
};

export async function consultarDisponibilidad(
  admin: SupabaseClient,
  clinicId: string,
  args: { fecha: string; profesional?: string }
): Promise<string> {
  const { fecha, profesional } = args;

  // Get clinic hours (assume 08:00-20:00 if not configured, 30-min slots)
  const { data: clinic } = await admin
    .from("clinic")
    .select("name")
    .eq("id", clinicId)
    .single();

  // Get existing appointments for that date
  const query = admin
    .from("turno")
    .select("time, duration, professional_name, status")
    .eq("clinic_id", clinicId)
    .eq("date", fecha)
    .in("status", ["confirmado", "pendiente", "scheduled"]);

  if (profesional) {
    query.ilike("professional_name", `%${profesional}%`);
  }

  const { data: turnos } = await query;

  // Get professionals for this clinic
  const profQuery = admin
    .from("professional")
    .select("full_name, specialty")
    .eq("clinic_id", clinicId);

  if (profesional) {
    profQuery.ilike("full_name", `%${profesional}%`);
  }

  const { data: profesionales } = await profQuery;

  // Generate available slots (08:00-20:00, every 30 min)
  const ocupados = new Set(
    (turnos ?? []).map((t) => `${t.time}-${t.professional_name}`)
  );

  const slotsLibres: { hora: string; profesional: string }[] = [];

  for (const prof of profesionales ?? []) {
    for (let h = 8; h < 20; h++) {
      for (const m of [0, 30]) {
        const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const key = `${hora}:00-${prof.full_name}`;
        if (!ocupados.has(key)) {
          slotsLibres.push({ hora, profesional: prof.full_name ?? "Sin asignar" });
        }
      }
    }
  }

  if (slotsLibres.length === 0) {
    return `No hay turnos disponibles para el ${fecha}${profesional ? ` con ${profesional}` : ""}. Probá con otra fecha.`;
  }

  // Limit to first 10 to keep message short
  const muestra = slotsLibres.slice(0, 10);
  const lines = muestra.map(
    (s) => `- ${s.hora} con ${s.profesional}`
  );

  let result = `Turnos disponibles para el ${fecha}:\n${lines.join("\n")}`;
  if (slotsLibres.length > 10) {
    result += `\n...y ${slotsLibres.length - 10} horarios más.`;
  }

  return result;
}
```

- [ ] **Step 2: Create agendar-turno.ts**

Create `src/lib/whatsapp/tools/agendar-turno.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";

export const agendarTurnoDeclaration = {
  name: "agendar_turno",
  description:
    "Agenda un turno nuevo para el paciente. Requiere fecha, hora y nombre del profesional. " +
    "Opcionalmente puede incluir el motivo/tratamiento y notas.",
  parameters: {
    type: "object" as const,
    properties: {
      fecha: {
        type: "string",
        description: "Fecha del turno en formato YYYY-MM-DD",
      },
      hora: {
        type: "string",
        description: "Hora del turno en formato HH:MM (24h)",
      },
      profesional: {
        type: "string",
        description: "Nombre del profesional",
      },
      motivo: {
        type: "string",
        description: "Motivo de la consulta o tratamiento",
      },
      notas: {
        type: "string",
        description: "Notas adicionales",
      },
    },
    required: ["fecha", "hora", "profesional"],
  },
};

export async function agendarTurno(
  admin: SupabaseClient,
  clinicId: string,
  patientId: string,
  patientName: string,
  args: { fecha: string; hora: string; profesional: string; motivo?: string; notas?: string }
): Promise<string> {
  const { fecha, hora, profesional, motivo, notas } = args;

  // Verify the slot is actually free
  const { data: existing } = await admin
    .from("turno")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("date", fecha)
    .eq("time", `${hora}:00`)
    .ilike("professional_name", `%${profesional}%`)
    .in("status", ["confirmado", "pendiente", "scheduled"])
    .limit(1);

  if (existing && existing.length > 0) {
    return `Ese horario ya está ocupado. Usá consultar_disponibilidad para ver horarios libres el ${fecha}.`;
  }

  // Find professional_id
  const { data: prof } = await admin
    .from("professional")
    .select("id, full_name")
    .eq("clinic_id", clinicId)
    .ilike("full_name", `%${profesional}%`)
    .limit(1)
    .single();

  const { error } = await admin.from("turno").insert({
    clinic_id: clinicId,
    date: fecha,
    time: `${hora}:00`,
    patient_id: patientId,
    patient_name: patientName,
    professional_id: prof?.id ?? null,
    professional_name: prof?.full_name ?? profesional,
    reason: motivo ?? null,
    notes: notas ?? null,
    status: "confirmado",
    source: "whatsapp_bot",
    duration: 30,
  });

  if (error) {
    console.error("[Tool agendar_turno] Error:", error.message);
    return "Hubo un error al agendar el turno. Por favor intentá de nuevo.";
  }

  return `Turno agendado con éxito:\n- Fecha: ${fecha}\n- Hora: ${hora}\n- Profesional: ${prof?.full_name ?? profesional}${motivo ? `\n- Motivo: ${motivo}` : ""}`;
}
```

- [ ] **Step 3: Create cancelar-turno.ts**

Create `src/lib/whatsapp/tools/cancelar-turno.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";

export const cancelarTurnoDeclaration = {
  name: "cancelar_turno",
  description:
    "Cancela un turno existente del paciente. Necesita el ID del turno " +
    "(obtenerlo primero con mis_turnos).",
  parameters: {
    type: "object" as const,
    properties: {
      turno_id: {
        type: "string",
        description: "ID del turno a cancelar",
      },
    },
    required: ["turno_id"],
  },
};

export async function cancelarTurno(
  admin: SupabaseClient,
  clinicId: string,
  patientId: string,
  args: { turno_id: string }
): Promise<string> {
  // Verify the appointment belongs to this patient and clinic
  const { data: turno } = await admin
    .from("turno")
    .select("id, date, time, professional_name, status")
    .eq("id", args.turno_id)
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .single();

  if (!turno) {
    return "No encontré ese turno. Usá mis_turnos para ver tus turnos activos.";
  }

  if (turno.status === "cancelado") {
    return "Ese turno ya fue cancelado.";
  }

  const { error } = await admin
    .from("turno")
    .update({ status: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", args.turno_id);

  if (error) {
    console.error("[Tool cancelar_turno] Error:", error.message);
    return "Hubo un error al cancelar. Intentá de nuevo.";
  }

  return `Turno cancelado:\n- Fecha: ${turno.date}\n- Hora: ${turno.time}\n- Profesional: ${turno.professional_name}`;
}
```

- [ ] **Step 4: Create reprogramar-turno.ts**

Create `src/lib/whatsapp/tools/reprogramar-turno.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";

export const reprogramarTurnoDeclaration = {
  name: "reprogramar_turno",
  description:
    "Reprograma un turno existente a una nueva fecha y hora. " +
    "Necesita el ID del turno (obtenerlo con mis_turnos) y la nueva fecha/hora.",
  parameters: {
    type: "object" as const,
    properties: {
      turno_id: {
        type: "string",
        description: "ID del turno a reprogramar",
      },
      nueva_fecha: {
        type: "string",
        description: "Nueva fecha en formato YYYY-MM-DD",
      },
      nueva_hora: {
        type: "string",
        description: "Nueva hora en formato HH:MM (24h)",
      },
    },
    required: ["turno_id", "nueva_fecha", "nueva_hora"],
  },
};

export async function reprogramarTurno(
  admin: SupabaseClient,
  clinicId: string,
  patientId: string,
  args: { turno_id: string; nueva_fecha: string; nueva_hora: string }
): Promise<string> {
  const { turno_id, nueva_fecha, nueva_hora } = args;

  // Verify ownership
  const { data: turno } = await admin
    .from("turno")
    .select("id, date, time, professional_name, professional_id")
    .eq("id", turno_id)
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .single();

  if (!turno) {
    return "No encontré ese turno. Usá mis_turnos para ver tus turnos activos.";
  }

  // Check the new slot is free
  const { data: conflict } = await admin
    .from("turno")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("date", nueva_fecha)
    .eq("time", `${nueva_hora}:00`)
    .eq("professional_name", turno.professional_name)
    .in("status", ["confirmado", "pendiente", "scheduled"])
    .limit(1);

  if (conflict && conflict.length > 0) {
    return `El horario ${nueva_hora} del ${nueva_fecha} con ${turno.professional_name} ya está ocupado. Consultá disponibilidad para esa fecha.`;
  }

  const { error } = await admin
    .from("turno")
    .update({
      date: nueva_fecha,
      time: `${nueva_hora}:00`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", turno_id);

  if (error) {
    console.error("[Tool reprogramar_turno] Error:", error.message);
    return "Hubo un error al reprogramar. Intentá de nuevo.";
  }

  return `Turno reprogramado:\n- Antes: ${turno.date} a las ${turno.time}\n- Ahora: ${nueva_fecha} a las ${nueva_hora}\n- Profesional: ${turno.professional_name}`;
}
```

- [ ] **Step 5: Create mis-turnos.ts**

Create `src/lib/whatsapp/tools/mis-turnos.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";

export const misTurnosDeclaration = {
  name: "mis_turnos",
  description:
    "Lista los próximos turnos del paciente. Muestra fecha, hora, profesional y estado.",
  parameters: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

export async function misTurnos(
  admin: SupabaseClient,
  clinicId: string,
  patientId: string
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const { data: turnos } = await admin
    .from("turno")
    .select("id, date, time, professional_name, reason, status")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .gte("date", today)
    .in("status", ["confirmado", "pendiente", "scheduled"])
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(10);

  if (!turnos || turnos.length === 0) {
    return "No tenés turnos próximos agendados.";
  }

  const lines = turnos.map(
    (t) =>
      `- ${t.date} a las ${t.time} con ${t.professional_name}${t.reason ? ` (${t.reason})` : ""} [ID: ${t.id.slice(0, 8)}]`
  );

  return `Tus próximos turnos:\n${lines.join("\n")}`;
}
```

- [ ] **Step 6: Create info-clinica.ts**

Create `src/lib/whatsapp/tools/info-clinica.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";

export const infoClinicaDeclaration = {
  name: "info_clinica",
  description:
    "Devuelve información general de la clínica: nombre, dirección, teléfono, " +
    "horarios de atención y profesionales disponibles.",
  parameters: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

export async function infoClinica(
  admin: SupabaseClient,
  clinicId: string
): Promise<string> {
  const { data: clinic } = await admin
    .from("clinic")
    .select("name, phone, email, email_clinic")
    .eq("id", clinicId)
    .single();

  const { data: profesionales } = await admin
    .from("professional")
    .select("full_name, specialty")
    .eq("clinic_id", clinicId);

  if (!clinic) {
    return "No se encontró información de la clínica.";
  }

  let info = `${clinic.name}`;
  if (clinic.phone) info += `\nTeléfono: ${clinic.phone}`;
  if (clinic.email_clinic || clinic.email)
    info += `\nEmail: ${clinic.email_clinic ?? clinic.email}`;

  if (profesionales && profesionales.length > 0) {
    info += "\n\nProfesionales:";
    for (const p of profesionales) {
      info += `\n- ${p.full_name ?? "Sin nombre"}${p.specialty ? ` (${p.specialty})` : ""}`;
    }
  }

  return info;
}
```

- [ ] **Step 7: Create info-tratamientos.ts**

Create `src/lib/whatsapp/tools/info-tratamientos.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";

export const infoTratamientosDeclaration = {
  name: "info_tratamientos",
  description:
    "Lista los tratamientos disponibles en la clínica con sus precios. " +
    "Puede filtrar por categoría si el paciente lo indica.",
  parameters: {
    type: "object" as const,
    properties: {
      categoria: {
        type: "string",
        description: "Categoría de tratamiento para filtrar (opcional)",
      },
    },
    required: [],
  },
};

export async function infoTratamientos(
  admin: SupabaseClient,
  clinicId: string,
  args: { categoria?: string }
): Promise<string> {
  const query = admin
    .from("tratamientos")
    .select("nombre, precio, categoria")
    .eq("clinic_id", clinicId);

  if (args.categoria) {
    query.ilike("categoria", `%${args.categoria}%`);
  }

  const { data: tratamientos } = await query.order("categoria").limit(20);

  if (!tratamientos || tratamientos.length === 0) {
    return args.categoria
      ? `No encontré tratamientos en la categoría "${args.categoria}".`
      : "No hay tratamientos cargados en el sistema.";
  }

  const lines = tratamientos.map(
    (t) =>
      `- ${t.nombre}${t.precio ? ` — $${t.precio}` : ""}${t.categoria ? ` (${t.categoria})` : ""}`
  );

  return `Tratamientos disponibles:\n${lines.join("\n")}`;
}
```

- [ ] **Step 8: Create registrar-paciente.ts**

Create `src/lib/whatsapp/tools/registrar-paciente.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";

export const registrarPacienteDeclaration = {
  name: "registrar_paciente",
  description:
    "Registra un paciente nuevo en el sistema. Usar cuando es la primera vez " +
    "que el paciente contacta a la clínica y no está registrado.",
  parameters: {
    type: "object" as const,
    properties: {
      nombre: {
        type: "string",
        description: "Nombre completo del paciente",
      },
      telefono: {
        type: "string",
        description: "Número de teléfono del paciente",
      },
    },
    required: ["nombre", "telefono"],
  },
};

export async function registrarPaciente(
  admin: SupabaseClient,
  clinicId: string,
  args: { nombre: string; telefono: string }
): Promise<{ message: string; patientId: string | null }> {
  const cleanPhone = args.telefono.replace(/\D/g, "");

  // Check if already exists
  const { data: existing } = await admin
    .from("patient")
    .select("id, full_name")
    .eq("clinic_id", clinicId)
    .eq("phone", cleanPhone)
    .limit(1)
    .single();

  if (existing) {
    return {
      message: `Ya estás registrado como ${existing.full_name}.`,
      patientId: existing.id,
    };
  }

  const { data: newPatient, error } = await admin
    .from("patient")
    .insert({
      clinic_id: clinicId,
      full_name: args.nombre,
      phone: cleanPhone,
      status: "activo",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Tool registrar_paciente] Error:", error.message);
    return { message: "Hubo un error al registrarte. Intentá de nuevo.", patientId: null };
  }

  return {
    message: `¡Listo! Te registré como ${args.nombre}. Ya podés agendar turnos.`,
    patientId: newPatient?.id ?? null,
  };
}
```

- [ ] **Step 9: Create tools index**

Create `src/lib/whatsapp/tools/index.ts`:

```typescript
import { type SupabaseClient } from "@supabase/supabase-js";
import {
  consultarDisponibilidadDeclaration,
  consultarDisponibilidad,
} from "./consultar-disponibilidad";
import { agendarTurnoDeclaration, agendarTurno } from "./agendar-turno";
import { cancelarTurnoDeclaration, cancelarTurno } from "./cancelar-turno";
import {
  reprogramarTurnoDeclaration,
  reprogramarTurno,
} from "./reprogramar-turno";
import { misTurnosDeclaration, misTurnos } from "./mis-turnos";
import { infoClinicaDeclaration, infoClinica } from "./info-clinica";
import {
  infoTratamientosDeclaration,
  infoTratamientos,
} from "./info-tratamientos";
import {
  registrarPacienteDeclaration,
  registrarPaciente,
} from "./registrar-paciente";

/** All tool declarations for Gemini function calling */
export const toolDeclarations = [
  consultarDisponibilidadDeclaration,
  agendarTurnoDeclaration,
  cancelarTurnoDeclaration,
  reprogramarTurnoDeclaration,
  misTurnosDeclaration,
  infoClinicaDeclaration,
  infoTratamientosDeclaration,
  registrarPacienteDeclaration,
];

export interface ToolContext {
  admin: SupabaseClient;
  clinicId: string;
  patientId: string | null;
  patientName: string | null;
  fromNumber: string;
}

/**
 * Executes a tool by name and returns the result as a string.
 * If the tool modifies patientId (registrar_paciente), returns it in the second value.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ result: string; newPatientId?: string }> {
  const { admin, clinicId, patientId, patientName, fromNumber } = ctx;

  switch (name) {
    case "consultar_disponibilidad":
      return {
        result: await consultarDisponibilidad(admin, clinicId, args as any),
      };

    case "agendar_turno": {
      if (!patientId) {
        return {
          result:
            "El paciente no está registrado. Primero usá registrar_paciente para registrarlo.",
        };
      }
      return {
        result: await agendarTurno(
          admin,
          clinicId,
          patientId,
          patientName ?? "Paciente",
          args as any
        ),
      };
    }

    case "cancelar_turno": {
      if (!patientId) {
        return { result: "No encontré tu registro de paciente." };
      }
      return {
        result: await cancelarTurno(admin, clinicId, patientId, args as any),
      };
    }

    case "reprogramar_turno": {
      if (!patientId) {
        return { result: "No encontré tu registro de paciente." };
      }
      return {
        result: await reprogramarTurno(admin, clinicId, patientId, args as any),
      };
    }

    case "mis_turnos": {
      if (!patientId) {
        return { result: "No encontré tu registro de paciente. ¿Querés registrarte?" };
      }
      return {
        result: await misTurnos(admin, clinicId, patientId),
      };
    }

    case "info_clinica":
      return { result: await infoClinica(admin, clinicId) };

    case "info_tratamientos":
      return {
        result: await infoTratamientos(admin, clinicId, args as any),
      };

    case "registrar_paciente": {
      const res = await registrarPaciente(admin, clinicId, {
        nombre: (args.nombre as string) ?? "Paciente",
        telefono: (args.telefono as string) ?? fromNumber,
      });
      return { result: res.message, newPatientId: res.patientId ?? undefined };
    }

    default:
      return { result: `Herramienta "${name}" no reconocida.` };
  }
}
```

- [ ] **Step 10: Commit all tools**

```bash
git add src/lib/whatsapp/tools/
git commit -m "feat(whatsapp): add 8 bot tools for appointments, info, and registration"
```

---

### Task 4: Create AI client and system prompt

**Files:**
- Create: `src/lib/whatsapp/system-prompt.ts`
- Create: `src/lib/whatsapp/ai-client.ts`

- [ ] **Step 1: Create system-prompt.ts**

Create `src/lib/whatsapp/system-prompt.ts`:

```typescript
export interface ClinicContext {
  clinicName: string;
  clinicPhone: string | null;
  clinicEmail: string | null;
  professionals: { name: string; specialty: string | null }[];
  patientName: string | null;
  isNewPatient: boolean;
  extraInstructions: string | null;
}

export function buildSystemPrompt(ctx: ClinicContext): string {
  const profList =
    ctx.professionals.length > 0
      ? ctx.professionals
          .map((p) => `- ${p.name}${p.specialty ? ` (${p.specialty})` : ""}`)
          .join("\n")
      : "- No hay profesionales cargados";

  const patientLine = ctx.patientName
    ? `El paciente que te escribe se llama ${ctx.patientName}.`
    : "Este paciente todavía no está registrado. Pedile su nombre para registrarlo con registrar_paciente.";

  return `Sos el asistente virtual por WhatsApp de ${ctx.clinicName}, una clínica dental.

## Tu rol
- Respondés consultas de pacientes por WhatsApp
- Agendás, cancelás y reprogramás turnos
- Informás sobre tratamientos, precios y obras sociales
- Registrás pacientes nuevos

## Reglas de comportamiento
- Hablá en español argentino, usá "vos" en vez de "tú"
- Sé profesional pero cálido y amable
- Mensajes CORTOS (es WhatsApp, no un email)
- NUNCA inventes información. Si no sabés algo, decí que no tenés esa info
- Antes de confirmar un turno, mostrá el resumen y pedí confirmación
- Si no podés resolver algo, sugerí llamar a la clínica${ctx.clinicPhone ? ` al ${ctx.clinicPhone}` : ""}
- No uses markdown (no **bold**, no listas con -, no headers). WhatsApp no lo renderiza bien. Usá texto plano.

## Datos de la clínica
Nombre: ${ctx.clinicName}
${ctx.clinicPhone ? `Teléfono: ${ctx.clinicPhone}` : ""}
${ctx.clinicEmail ? `Email: ${ctx.clinicEmail}` : ""}

Profesionales:
${profList}

## Paciente actual
${patientLine}

## Herramientas disponibles
Tenés herramientas para consultar disponibilidad, agendar turnos, cancelar, reprogramar, ver turnos del paciente, info de la clínica, tratamientos y registrar pacientes nuevos. Usalas siempre que necesites datos reales.
${ctx.extraInstructions ? `\n## Instrucciones adicionales de la clínica\n${ctx.extraInstructions}` : ""}`;
}
```

- [ ] **Step 2: Create ai-client.ts**

Create `src/lib/whatsapp/ai-client.ts`:

```typescript
import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type Content,
} from "@google/generative-ai";
import { toolDeclarations, executeTool, type ToolContext } from "./tools";

const API_KEY = process.env.GOOGLE_AI_API_KEY ?? "";

const MAX_TOOL_ROUNDS = 5;

/**
 * Sends a message to Gemini with tool calling support.
 * Handles multi-round tool execution (Gemini calls tool → we execute → feed result back).
 * Returns the final text response.
 */
export async function chatWithGemini(
  systemPrompt: string,
  conversationHistory: Content[],
  userMessage: string,
  toolCtx: ToolContext
): Promise<string> {
  if (!API_KEY) {
    console.error("[AI Client] GOOGLE_AI_API_KEY not set");
    return "El asistente no está disponible en este momento. Por favor llamá a la clínica.";
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    tools: [
      {
        functionDeclarations: toolDeclarations as FunctionDeclaration[],
      },
    ],
  });

  // Build history + new user message
  const contents: Content[] = [
    ...conversationHistory,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let currentPatientId = toolCtx.patientId;

  try {
    let result = await model.generateContent({ contents });
    let response = result.response;

    // Tool calling loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const candidate = response.candidates?.[0];
      if (!candidate) break;

      const functionCalls = candidate.content.parts.filter(
        (p) => "functionCall" in p
      );

      if (functionCalls.length === 0) break;

      // Execute each function call
      const functionResponses: Content = {
        role: "function" as const,
        parts: [],
      };

      for (const part of functionCalls) {
        if (!("functionCall" in part)) continue;
        const fc = part.functionCall;
        console.log(`[AI Client] Tool call: ${fc.name}(${JSON.stringify(fc.args)})`);

        const { result: toolResult, newPatientId } = await executeTool(
          fc.name,
          (fc.args as Record<string, unknown>) ?? {},
          { ...toolCtx, patientId: currentPatientId }
        );

        if (newPatientId) {
          currentPatientId = newPatientId;
        }

        functionResponses.parts.push({
          functionResponse: {
            name: fc.name,
            response: { result: toolResult },
          },
        });
      }

      // Feed tool results back to Gemini
      const updatedContents: Content[] = [
        ...contents,
        candidate.content,
        functionResponses,
      ];

      result = await model.generateContent({ contents: updatedContents });
      response = result.response;
    }

    return response.text() || "No pude generar una respuesta. Intentá de nuevo.";
  } catch (err: any) {
    console.error("[AI Client] Error:", err.message);
    return "Disculpá, tuve un problema procesando tu mensaje. Intentá de nuevo o llamá a la clínica.";
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/whatsapp/system-prompt.ts src/lib/whatsapp/ai-client.ts
git commit -m "feat(whatsapp): add Gemini AI client with tool calling and system prompt builder"
```

---

### Task 5: Create context builder and bot processor

**Files:**
- Create: `src/lib/whatsapp/context-builder.ts`
- Create: `src/lib/whatsapp/bot-processor.ts`

- [ ] **Step 1: Create context-builder.ts**

Create `src/lib/whatsapp/context-builder.ts`:

```typescript
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
      role: m.direction === "inbound" ? "user" : ("model" as const),
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
```

- [ ] **Step 2: Create bot-processor.ts**

Create `src/lib/whatsapp/bot-processor.ts`:

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBotContext } from "./context-builder";
import { buildSystemPrompt } from "./system-prompt";
import { chatWithGemini } from "./ai-client";
import { sendBotMessage } from "./send-bot-message";
import { type ToolContext } from "./tools";

/**
 * Checks if the current time falls within the bot's active hours and days.
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
      console.log("[Bot] No context (bot disabled or no connection) for", phoneId);
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
    await sendBotMessage(phoneId, fromNumber, aiResponse, ctx.accessToken, clinicId);

    console.log("[Bot] Responded to", fromNumber, "via", phoneId);
  } catch (err: any) {
    console.error("[Bot] Error processing message:", err.message);

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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/whatsapp/context-builder.ts src/lib/whatsapp/bot-processor.ts
git commit -m "feat(whatsapp): add context builder and bot processor orchestrator"
```

---

### Task 6: Integrate bot into webhook

Modify the existing webhook to call the bot processor when an inbound text message arrives.

**Files:**
- Modify: `src/app/api/webhooks/whatsapp/route.ts`

- [ ] **Step 1: Add bot-processor import and call**

At the top of the file, after the existing imports, add:

```typescript
import { processInboundMessage } from "@/lib/whatsapp/bot-processor";
```

Then inside the POST handler, after the message is saved successfully (after the `else` block at line ~128), add the bot processing call. Find this block:

```typescript
                    if (error) {
                        console.error("[WA Webhook] Error saving message:", error.message);
                    } else {
                        console.log("[WA Webhook] Message saved:", msg.id, "from:", msg.from);
                    }
```

Replace it with:

```typescript
                    if (error) {
                        console.error("[WA Webhook] Error saving message:", error.message);
                    } else {
                        console.log("[WA Webhook] Message saved:", msg.id, "from:", msg.from);

                        // Trigger bot processing for text messages (don't await — respond to Meta fast)
                        if (msg.type === "text" && clinicId && record.body) {
                            processInboundMessage(
                                clinicId,
                                phoneId,
                                msg.from as string,
                                record.body
                            ).catch((err) =>
                                console.error("[WA Webhook] Bot error:", err.message)
                            );
                        }
                    }
```

**Important:** We fire-and-forget the bot processing (`.catch()` instead of `await`) so the webhook returns 200 to Meta immediately. Meta requires fast responses.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/whatsapp/route.ts
git commit -m "feat(whatsapp): integrate bot processor into webhook for inbound messages"
```

---

### Task 7: Auto-create bot config on WhatsApp connection

When a clinic connects WhatsApp via the OAuth callback, automatically create a default bot config.

**Files:**
- Modify: `src/app/api/auth/whatsapp/callback/route.ts`

- [ ] **Step 1: Add bot config creation after upsert**

In the POST handler, after the successful `user_whatsapps` upsert (after `if (dbError)` check around line 174), add:

```typescript
        // Create default bot config for this connection
        await admin
            .from("whatsapp_bot_config")
            .upsert(
                {
                    clinic_id: prof?.clinic_id ?? null,
                    phone_id: wabaInfo.phone_id,
                    enabled: true,
                    greeting_message: "¡Hola! Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte?",
                    out_of_hours_message: "Gracias por escribirnos. Estamos fuera del horario de atención. Te responderemos a la brevedad.",
                    bot_hours_start: "08:00",
                    bot_hours_end: "20:00",
                    bot_active_days: [1, 2, 3, 4, 5, 6],
                    ai_model: "gemini-2.0-flash",
                },
                { onConflict: "clinic_id,phone_id" }
            );

        console.log("[WA callback] Bot config created for phone:", wabaInfo.phone_id);
```

This goes right before the `console.log("[WA callback] Saved connection for user:..."` line.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/whatsapp/callback/route.ts
git commit -m "feat(whatsapp): auto-create bot config on WhatsApp connection"
```

---

### Task 8: Create WhatsApp Bot config UI tab

Add a "WhatsApp Bot" tab to the config page where the clinic can configure the bot.

**Files:**
- Create: `src/components/config/WhatsAppBotTab.tsx`
- Modify: `src/app/(app)/config/page.tsx`

- [ ] **Step 1: Create WhatsAppBotTab.tsx**

Create `src/components/config/WhatsAppBotTab.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  MessageSquare,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface BotConfig {
  id: string;
  clinic_id: string;
  phone_id: string;
  enabled: boolean;
  greeting_message: string;
  out_of_hours_message: string;
  bot_hours_start: string;
  bot_hours_end: string;
  bot_active_days: number[];
  ai_model: string;
  system_prompt_extra: string | null;
}

interface WhatsAppConnection {
  phone_id: string;
  display_number: string;
  verified_name: string;
  status: string;
}

const DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
];

export default function WhatsAppBotTab({ clinicId }: { clinicId: string }) {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // supabase is imported as singleton from client.ts

  useEffect(() => {
    loadData();
  }, [clinicId]);

  async function loadData() {
    setLoading(true);

    // Load WhatsApp connection
    const { data: conn } = await supabase
      .from("user_whatsapps")
      .select("phone_id, display_number, verified_name, status")
      .eq("clinic_id", clinicId)
      .eq("status", "active")
      .limit(1)
      .single();

    setConnection(conn);

    if (conn?.phone_id) {
      // Load bot config
      const { data: botConfig } = await supabase
        .from("whatsapp_bot_config")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("phone_id", conn.phone_id)
        .single();

      setConfig(botConfig);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);

    const { error } = await supabase
      .from("whatsapp_bot_config")
      .update({
        enabled: config.enabled,
        greeting_message: config.greeting_message,
        out_of_hours_message: config.out_of_hours_message,
        bot_hours_start: config.bot_hours_start,
        bot_hours_end: config.bot_hours_end,
        bot_active_days: config.bot_active_days,
        system_prompt_extra: config.system_prompt_extra,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id);

    setSaving(false);

    if (error) {
      toast.error("Error al guardar la configuración");
      console.error(error);
    } else {
      toast.success("Configuración guardada");
    }
  }

  function toggleDay(day: number) {
    if (!config) return;
    const days = config.bot_active_days.includes(day)
      ? config.bot_active_days.filter((d) => d !== day)
      : [...config.bot_active_days, day].sort();
    setConfig({ ...config, bot_active_days: days });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connection) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Primero conectá tu número de WhatsApp Business en la sección de{" "}
            <a href="/whatsapp-connect" className="text-accent underline">
              Integraciones
            </a>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No se encontró configuración del bot. Intentá reconectar tu WhatsApp.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp Conectado
              </CardTitle>
              <CardDescription>
                {connection.verified_name} — {connection.display_number}
              </CardDescription>
            </div>
            <Badge variant={config.enabled ? "default" : "secondary"}>
              {config.enabled ? "Bot Activo" : "Bot Inactivo"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Bot Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Asistente Virtual
          </CardTitle>
          <CardDescription>
            Configurá el bot que responde automáticamente a los pacientes por WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Bot habilitado</Label>
              <p className="text-sm text-muted-foreground">
                El bot responde automáticamente a los mensajes entrantes
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enabled: checked })
              }
            />
          </div>

          {/* Greeting */}
          <div className="space-y-2">
            <Label>Mensaje de saludo</Label>
            <Textarea
              value={config.greeting_message}
              onChange={(e) =>
                setConfig({ ...config, greeting_message: e.target.value })
              }
              rows={2}
              placeholder="¡Hola! Soy el asistente virtual..."
            />
          </div>

          {/* Out of hours */}
          <div className="space-y-2">
            <Label>Mensaje fuera de horario</Label>
            <Textarea
              value={config.out_of_hours_message}
              onChange={(e) =>
                setConfig({
                  ...config,
                  out_of_hours_message: e.target.value,
                })
              }
              rows={2}
              placeholder="Gracias por escribirnos. Estamos fuera de horario..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horario del Bot
          </CardTitle>
          <CardDescription>
            Fuera de este horario se envía el mensaje de "fuera de horario".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="time"
                value={config.bot_hours_start}
                onChange={(e) =>
                  setConfig({ ...config, bot_hours_start: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="time"
                value={config.bot_hours_end}
                onChange={(e) =>
                  setConfig({ ...config, bot_hours_end: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Días activos</Label>
            <div className="flex gap-2">
              {DAYS.map((d) => (
                <Button
                  key={d.value}
                  variant={
                    config.bot_active_days.includes(d.value)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => toggleDay(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extra Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones Adicionales</CardTitle>
          <CardDescription>
            Agregá instrucciones extra para personalizar el comportamiento del
            bot. Por ejemplo: "No ofrecer turnos los sábados después de las 13hs".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.system_prompt_extra ?? ""}
            onChange={(e) =>
              setConfig({
                ...config,
                system_prompt_extra: e.target.value || null,
              })
            }
            rows={3}
            placeholder="Instrucciones opcionales..."
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add tab to config page**

In `src/app/(app)/config/page.tsx`, add the import at the top with the other imports:

```typescript
import WhatsAppBotTab from "@/components/config/WhatsAppBotTab";
```

Then add a new `TabsTrigger` after the "Integraciones" trigger (around line 514):

```tsx
<TabsTrigger value="whatsapp-bot" className="data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-sm">WhatsApp Bot</TabsTrigger>
```

And add the corresponding `TabsContent` before the closing `</Tabs>` tag (after the integraciones TabsContent):

```tsx
                <TabsContent value="whatsapp-bot" className="mt-6 data-[state=inactive]:hidden" forceMount>
                    {clinic?.id && <WhatsAppBotTab clinicId={clinic.id} />}
                </TabsContent>
```

The variable `clinic` is already available in the component — it's loaded at the top of the component from `useAuth()`.

- [ ] **Step 3: Commit**

```bash
git add src/components/config/WhatsAppBotTab.tsx src/app/(app)/config/page.tsx
git commit -m "feat(whatsapp): add WhatsApp Bot config tab in settings"
```

---

### Task 9: Manual testing

**Prerequisites:**
- `GOOGLE_AI_API_KEY` set in `.env.local`
- WhatsApp connection already active (via Meta Embedded Signup)
- Migration run in Supabase

- [ ] **Step 1: Verify environment variable**

```bash
grep GOOGLE_AI_API_KEY .env.local
```

If missing, add it:
```bash
echo "GOOGLE_AI_API_KEY=your-key-from-aistudio-google-com" >> .env.local
```

- [ ] **Step 2: Start dev server and verify config tab**

```bash
npm run dev
```

Open `http://localhost:3000/config` and verify the "WhatsApp Bot" tab appears and shows the configuration form.

- [ ] **Step 3: Test the bot via WhatsApp**

Send a message to the connected WhatsApp Business number. Verify:
1. The webhook receives it (check server logs for `[WA Webhook] Message saved`)
2. The bot processor runs (check logs for `[Bot] Responded to`)
3. A response arrives on WhatsApp from the bot

- [ ] **Step 4: Test tool calling**

Send these messages and verify correct behavior:
- "Hola" → bot should greet and ask how it can help
- "Qué tratamientos tienen?" → should invoke `info_tratamientos`
- "Qué turnos hay mañana?" → should invoke `consultar_disponibilidad`
- "Quiero sacar un turno" → bot should ask details and use `agendar_turno`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(whatsapp): complete WhatsApp bot with AI tool calling integration"
```
