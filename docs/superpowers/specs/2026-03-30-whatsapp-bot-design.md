# WhatsApp Bot Integrado con Livio - Spec de Diseno

**Fecha:** 2026-03-30
**Estado:** Aprobado
**Scope:** Bot de WhatsApp autonomo integrado con datos de clinica dental

---

## 1. Objetivo

Permitir que las clinicas conecten su numero de WhatsApp Business via Meta Embedded Signup y tengan un bot de IA funcionando automaticamente. El bot responde consultas, agenda/cancela/reprograma turnos, informa sobre tratamientos y obras sociales, y registra pacientes nuevos — todo sin intervencion humana.

## 2. Arquitectura General

```
Paciente (WhatsApp)
  -> Meta Webhook -> /api/webhooks/whatsapp
    -> Identifica clinica por phone_id (tabla user_whatsapps)
    -> Verifica bot habilitado y dentro de horario (tabla whatsapp_bot_config)
    -> Busca/crea paciente por numero de telefono (tabla patient)
    -> Carga contexto de la clinica (horarios, tratamientos, turnos)
    -> Carga historial de conversacion (ultimos ~10 mensajes)
    -> Envia a Gemini 2.0 Flash con system prompt + tools
    -> Gemini decide accion (responder texto, invocar tool, o ambas)
    -> Ejecuta la accion en Supabase
    -> Guarda mensajes en whatsapp_messages
    -> Responde al paciente via WhatsApp API
```

## 3. Componentes

### 3.1 Router de Mensajes (webhook existente modificado)

**Archivo:** `src/app/api/webhooks/whatsapp/route.ts` (existente)

Modificacion: despues de guardar el mensaje inbound, llama al bot-processor si el bot esta habilitado para esa clinica.

### 3.2 Bot Processor (orquestador)

**Archivo nuevo:** `src/lib/whatsapp/bot-processor.ts`

Responsabilidades:
- Recibe el mensaje inbound + clinic_id + phone_id
- Verifica config del bot (habilitado, horario, etc.)
- Si fuera de horario: envia mensaje configurado y retorna
- Si habilitado: llama a context-builder, luego al AI client
- Ejecuta tools si Gemini las invoca
- Envia respuesta via WhatsApp API existente
- Guarda mensaje outbound en whatsapp_messages

### 3.3 Context Builder

**Archivo nuevo:** `src/lib/whatsapp/context-builder.ts`

Arma el contexto de la clinica desde Supabase:
- Datos de la clinica (nombre, direccion, telefono, horarios)
- Lista de profesionales con sus especialidades
- Tratamientos disponibles con precios
- Obras sociales aceptadas
- Datos del paciente (si ya existe): nombre, proximos turnos, historial
- Ultimos ~10 mensajes de la conversacion para contexto

### 3.4 AI Client

**Archivo nuevo:** `src/lib/whatsapp/ai-client.ts`

Wrapper sobre `@google/generative-ai`:
- Inicializa Gemini 2.0 Flash con tools
- Maneja el ciclo de tool calling (request -> tool call -> tool result -> response)
- Soporta multiples rondas de tool calling en un solo turno
- Diseno agnostico: cambiar modelo = cambiar una linea de config

### 3.5 System Prompt Builder

**Archivo nuevo:** `src/lib/whatsapp/system-prompt.ts`

Genera el system prompt dinamicamente por clinica:
- Nombre y datos de contacto de la clinica
- Horarios de atencion
- Profesionales y especialidades
- Reglas de comportamiento:
  - Responder en espanol argentino, tono profesional pero calido
  - Usar "vos" en vez de "tu"
  - Siempre confirmar antes de agendar un turno
  - Si no puede resolver algo, dar el telefono de la clinica
  - No inventar informacion, usar solo los datos disponibles
  - Ser conciso (mensajes de WhatsApp deben ser cortos)
- Instrucciones extra configuradas por la clinica (campo system_prompt_extra)

### 3.6 Tools (funciones invocables por la IA)

**Directorio nuevo:** `src/lib/whatsapp/tools/`

Cada tool es un archivo con:
- Schema de parametros (para Gemini tool calling)
- Funcion de ejecucion (consulta/mutacion en Supabase)

#### Tools disponibles:

| Tool | Archivo | Descripcion | Parametros |
|------|---------|-------------|------------|
| `consultar_disponibilidad` | `consultar-disponibilidad.ts` | Busca slots libres | fecha, tratamiento (opcional), profesional (opcional) |
| `agendar_turno` | `agendar-turno.ts` | Crea un turno | fecha, hora, tratamiento, profesional (opcional), notas (opcional) |
| `cancelar_turno` | `cancelar-turno.ts` | Cancela un turno del paciente | turno_id |
| `reprogramar_turno` | `reprogramar-turno.ts` | Mueve un turno | turno_id, nueva_fecha, nueva_hora |
| `mis_turnos` | `mis-turnos.ts` | Lista proximos turnos del paciente | (sin parametros, usa el paciente actual) |
| `info_clinica` | `info-clinica.ts` | Horarios, direccion, profesionales | (sin parametros) |
| `info_tratamientos` | `info-tratamientos.ts` | Lista tratamientos con precios y OS | categoria (opcional) |
| `registrar_paciente` | `registrar-paciente.ts` | Registra paciente nuevo | nombre, apellido, telefono |

**Index:** `src/lib/whatsapp/tools/index.ts` exporta todas las tools como array de definiciones Gemini + map de ejecutores.

## 4. Base de Datos

### 4.1 Tabla nueva: `whatsapp_bot_config`

```sql
CREATE TABLE whatsapp_bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinic(id) ON DELETE CASCADE,
  phone_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  greeting_message TEXT DEFAULT 'Hola! Soy el asistente virtual de la clinica. En que puedo ayudarte?',
  out_of_hours_message TEXT DEFAULT 'Gracias por escribirnos. Estamos fuera de horario de atencion. Te responderemos a la brevedad.',
  bot_hours_start TIME DEFAULT '08:00',
  bot_hours_end TIME DEFAULT '20:00',
  bot_active_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  ai_model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  system_prompt_extra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, phone_id)
);

-- RLS: solo el owner de la clinica puede leer/escribir
ALTER TABLE whatsapp_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_owner_access" ON whatsapp_bot_config
  USING (clinic_id IN (
    SELECT clinic_id FROM professional WHERE user_id = auth.uid()
  ));
```

### 4.2 Tablas existentes usadas (sin modificar)

- `user_whatsapps` — conexion WhatsApp de la clinica
- `whatsapp_messages` — historial de mensajes (ya guarda inbound/outbound)
- `clinic` — datos de la clinica
- `professional` — profesionales
- `turno` — turnos/citas
- `patient` — pacientes (campo `phone` existente se usa para identificar por numero de WhatsApp)
- `tratamientos` — tratamientos y precios
- `obras_sociales` — obras sociales

## 5. Flujo de Conexion (UX)

### Paso 1: Conexion (ya implementado)
1. Clinica navega a `/whatsapp-connect`
2. Click en "Conectar WhatsApp" -> Meta Embedded Signup
3. Autoriza permisos -> callback guarda en `user_whatsapps`
4. Redirect a `/whatsapp-success`

### Paso 2: Configuracion del Bot (nuevo)
1. Despues de conectar, se crea automaticamente un registro en `whatsapp_bot_config` con defaults
2. En la pagina de config (`/config` -> tab WhatsApp) la clinica puede:
   - Ver numero conectado y estado
   - Toggle activar/desactivar bot
   - Editar mensaje de saludo
   - Editar mensaje fuera de horario
   - Configurar horarios del bot
   - Agregar instrucciones extra para la IA

### Paso 3: Listo
- El bot responde automaticamente a mensajes entrantes
- La clinica puede ver el historial de conversaciones

## 6. Manejo de Errores

- **Gemini falla (timeout, error de red, rate limit):** try/catch, respuesta fallback: "Disculpa, no pude procesar tu mensaje. Intenta de nuevo o llamanos al [telefono de la clinica]."
- **Tool falla (ej: no hay disponibilidad):** el resultado del error se devuelve a Gemini y este lo comunica amablemente al paciente
- **Numero no reconocido como clinica:** webhook retorna 200 sin procesar (evita reintentos de Meta)
- **Bot deshabilitado:** no responde, el mensaje queda guardado para que la clinica lo vea
- **Fuera de horario:** envia el mensaje configurado de fuera de horario

## 7. Dependencias Nuevas

- `@google/generative-ai` — SDK oficial de Google para Gemini

## 8. Variables de Entorno Nuevas

- `GOOGLE_AI_API_KEY` — API key de Google AI Studio (gratis en https://aistudio.google.com)

## 9. Archivos a Crear

```
src/lib/whatsapp/
  bot-processor.ts
  context-builder.ts
  ai-client.ts
  system-prompt.ts
  tools/
    index.ts
    consultar-disponibilidad.ts
    agendar-turno.ts
    cancelar-turno.ts
    reprogramar-turno.ts
    mis-turnos.ts
    info-clinica.ts
    info-tratamientos.ts
    registrar-paciente.ts

supabase/migrations/20260330_whatsapp_bot_config.sql
```

## 10. Archivos a Modificar

- `src/app/api/webhooks/whatsapp/route.ts` — integrar bot-processor en el flujo de mensajes inbound
- `src/app/(app)/config/page.tsx` — agregar tab de configuracion WhatsApp bot
- `src/app/api/auth/whatsapp/callback/route.ts` — crear whatsapp_bot_config con defaults despues de conectar

## 11. Fuera de Scope (futuro)

- Vista de conversaciones en el dashboard (chat UI)
- Envio de imagenes/archivos por WhatsApp
- Notificaciones proactivas (recordatorios de turnos)
- Multiples modelos de IA por clinica
- Analytics de uso del bot
- Escalado a humano en tiempo real
