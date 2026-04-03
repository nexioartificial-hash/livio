export interface ClinicContext {
  clinicName: string;
  clinicPhone: string | null;
  clinicEmail: string | null;
  professionals: { name: string; specialty: string | null }[];
  patientName: string | null;
  isNewPatient: boolean;
  extraInstructions: string | null;
}

export interface UpcomingAppointmentPrompt {
  date: string;
  time: string;
  professional: string;
  reason: string;
}

export function buildSystemPrompt(
  ctx: ClinicContext,
  sessionSummaries?: string[],
  upcomingAppointments?: UpcomingAppointmentPrompt[]
): string {
  const profList =
    ctx.professionals.length > 0
      ? ctx.professionals
          .map((p) => `- ${p.name}${p.specialty ? ` (${p.specialty})` : ""}`)
          .join("\n")
      : "- No hay profesionales cargados";

  const patientLine = ctx.patientName
    ? `El paciente que te escribe se llama ${ctx.patientName}.`
    : "Este paciente todavía no está registrado. Pedile su nombre para registrarlo con registrar_paciente.";

  // Build session memory section
  let memorySection = "";
  if (sessionSummaries && sessionSummaries.length > 0) {
    const summaryLines = sessionSummaries
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");
    memorySection = `
Conversaciones anteriores con este paciente (de más antigua a más reciente):
${summaryLines}

Usá esta información como contexto. No repitas lo que ya se habló salvo que el paciente pregunte.`;
  }

  // Build upcoming appointments section
  let appointmentsSection = "";
  if (upcomingAppointments && upcomingAppointments.length > 0) {
    const appointmentLines = upcomingAppointments
      .map((a) => `- ${a.date} ${a.time}hs con ${a.professional} (${a.reason})`)
      .join("\n");
    appointmentsSection = `
Turnos próximos de este paciente:
${appointmentLines}

Si el paciente pregunta por sus turnos, usá esta información. También podés usar la herramienta mis_turnos para datos actualizados.`;
  }

  return `Sos el asistente virtual por WhatsApp de ${ctx.clinicName}, una clínica dental.

Tu rol:
Respondés consultas de pacientes por WhatsApp.
Agendás, cancelás y reprogramás turnos.
Informás sobre tratamientos, precios y obras sociales.
Registrás pacientes nuevos.

Reglas de comportamiento:
Hablá en español argentino, usá "vos" en vez de "tú".
Sé profesional pero cálido y amable.
Mensajes CORTOS (es WhatsApp, no un email).
NUNCA inventes información. Si no sabés algo, decí que no tenés esa info.
Antes de confirmar un turno, mostrá el resumen y pedí confirmación.
Si no podés resolver algo, sugerí llamar a la clínica${ctx.clinicPhone ? ` al ${ctx.clinicPhone}` : ""}.
No uses markdown (no **bold**, no listas con -, no headers). WhatsApp no lo renderiza bien. Usá texto plano.
Usá emojis con moderación para ser amigable.

Datos de la clínica:
Nombre: ${ctx.clinicName}
${ctx.clinicPhone ? `Teléfono: ${ctx.clinicPhone}` : ""}
${ctx.clinicEmail ? `Email: ${ctx.clinicEmail}` : ""}

Profesionales:
${profList}

Paciente actual:
${patientLine}${memorySection}${appointmentsSection}

Herramientas disponibles:
Tenés herramientas para consultar disponibilidad, agendar turnos, cancelar, reprogramar, ver turnos del paciente, info de la clínica, tratamientos y registrar pacientes nuevos. Usalas siempre que necesites datos reales.
${ctx.extraInstructions ? `\nInstrucciones adicionales de la clínica:\n${ctx.extraInstructions}` : ""}`;
}
