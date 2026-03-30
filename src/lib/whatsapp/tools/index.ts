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
 * If the tool modifies patientId (registrar_paciente), returns it in newPatientId.
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
        result: await consultarDisponibilidad(
          admin,
          clinicId,
          args as { fecha: string; profesional?: string }
        ),
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
          args as {
            fecha: string;
            hora: string;
            profesional: string;
            motivo?: string;
            notas?: string;
          }
        ),
      };
    }

    case "cancelar_turno": {
      if (!patientId) {
        return { result: "No encontré tu registro de paciente." };
      }
      return {
        result: await cancelarTurno(
          admin,
          clinicId,
          patientId,
          args as { turno_id: string }
        ),
      };
    }

    case "reprogramar_turno": {
      if (!patientId) {
        return { result: "No encontré tu registro de paciente." };
      }
      return {
        result: await reprogramarTurno(
          admin,
          clinicId,
          patientId,
          args as {
            turno_id: string;
            nueva_fecha: string;
            nueva_hora: string;
          }
        ),
      };
    }

    case "mis_turnos": {
      if (!patientId) {
        return {
          result:
            "No encontré tu registro de paciente. ¿Querés registrarte?",
        };
      }
      return {
        result: await misTurnos(admin, clinicId, patientId),
      };
    }

    case "info_clinica":
      return { result: await infoClinica(admin, clinicId) };

    case "info_tratamientos":
      return {
        result: await infoTratamientos(
          admin,
          clinicId,
          args as { categoria?: string }
        ),
      };

    case "registrar_paciente": {
      const res = await registrarPaciente(admin, clinicId, {
        nombre: (args.nombre as string) ?? "Paciente",
        telefono: (args.telefono as string) ?? fromNumber,
      });
      return {
        result: res.message,
        newPatientId: res.patientId ?? undefined,
      };
    }

    default:
      return { result: `Herramienta "${name}" no reconocida.` };
  }
}
