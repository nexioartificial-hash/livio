# Livio - SaaS de Gestión para Clínicas Dentales

## Descripción

Livio es una aplicación full-stack SaaS para gestión de clínicas dentales. Maneja pacientes, turnos, historia clínica, equipo de trabajo, facturación, mensajería por WhatsApp, sincronización con Google Calendar y pagos por suscripción.

## Stack Tecnológico

- **Framework:** Next.js 16.1.6 (App Router) + React 19 + TypeScript (strict)
- **Estilos:** Tailwind CSS 4 + shadcn/ui (estilo New York) + Framer Motion
- **Base de datos:** Supabase (PostgreSQL) con RLS + suscripciones en tiempo real
- **Autenticación:** Supabase Auth (email/password, remember-me, verificación por email)
- **Pagos:** MercadoPago SDK
- **Email:** Resend
- **Integraciones:** Google Calendar API, WhatsApp Business API (Meta), Tesseract.js (OCR)
- **Formularios:** React Hook Form + Zod 4
- **Gráficos:** Recharts

## Arquitectura

```
src/
├── app/
│   ├── (app)/            # Rutas protegidas (dashboard, agenda, pacientes, etc.)
│   ├── (auth)/           # Rutas de auth (login, register, forgot-password)
│   ├── (public)/         # Rutas públicas (landing, pricing, terms)
│   ├── actions/          # Server Actions (mutaciones)
│   └── api/              # API Routes (webhooks, integraciones)
├── components/           # Componentes agrupados por feature
│   └── ui/               # Componentes base de shadcn/ui
├── hooks/                # Custom React hooks
├── lib/
│   ├── supabase/         # Clientes DB (client.ts, server.ts, admin.ts)
│   ├── integrations/     # Integraciones externas (Google Calendar)
│   ├── email/            # Servicio de email (Resend) + templates
│   ├── security/         # Auth helpers, rate limiter, audit log, validadores
│   └── validators/       # Validación de configuración
├── providers/            # Context providers (auth, notifications, sidebar)
├── types/                # Tipos auto-generados de Supabase (database.types.ts)
└── utils/                # Formatters y máscaras de input
```

## Patrones Clave

### Clientes Supabase
- `lib/supabase/client.ts` — Cliente browser (usar en componentes client)
- `lib/supabase/server.ts` — Cliente server (usar en Server Components / Actions)
- `lib/supabase/admin.ts` — Cliente admin con service role (bypasea RLS)

### Flujo de Autenticación
- Middleware (`src/middleware.ts`) protege rutas `(app)`, redirige a `/login` si no hay sesión
- `AuthProvider` enriquece la sesión del usuario con datos de perfil + clínica
- Roles: `superadmin`, `recepcionista`, `profesional`

### Mutaciones de Datos
- Usar Server Actions en `src/app/actions/` para mutaciones in-app
- Usar API Routes en `src/app/api/` para webhooks e integraciones externas

### Convenciones de UI
- Componentes base de shadcn/ui en `src/components/ui/`
- Componentes de feature agrupados por dominio (agenda, patients, dashboard, etc.)
- Notificaciones toast via Sonner
- Dark mode via next-themes
- Path alias: `@/*` apunta a `./src/*`

## Base de Datos

PostgreSQL via Supabase con Row-Level Security en todas las tablas. Tablas principales:
- `professional` — Staff (vinculado a auth.users)
- `patient` — Registros de pacientes
- `turno` — Turnos/citas
- `clinic` — Info y configuración de la clínica
- `clinical_record` — Historia clínica + odontogramas
- `inventario` — Stock/inventario
- `tratamientos` — Tipos de tratamiento y precios
- `obras_sociales` — Obras sociales / prepagas

Esquema en `src/lib/supabase/production_schema.sql`. Migraciones en `supabase/migrations/`.

## Comandos

```bash
npm run dev        # Servidor de desarrollo (localhost:3000)
npm run build      # Build de producción
npm run lint       # ESLint
```

## Variables de Entorno

Las env vars están en `.env.local` (nunca commitear). Prefijos principales:
- `NEXT_PUBLIC_SUPABASE_*` — Config pública de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Acceso admin (solo server)
- `GOOGLE_*` — OAuth de Google Calendar
- `RESEND_API_KEY` — Servicio de email
- `MP_*` / `MERCADOPAGO_*` — Procesamiento de pagos
- `WHATSAPP_*` / `META_*` — WhatsApp Business API

## Notas de Desarrollo

- La app está en español (mercado argentino). Textos de UI, rutas y nombres de variables mezclan español e inglés.
- Validación de CUIT usa algoritmo mod-11 (ID fiscal argentino).
- Sistema de turnos usa slots de 15 minutos con soporte de timezone (Luxon).
- Integración WhatsApp usa Meta Business API con verificación de webhook.
- Sincronización Google Calendar soporta push/pull bidireccional.
