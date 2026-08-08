# 🦷 Livio — Gestión integral para clínicas dentales

**SaaS full-stack** para administrar una clínica dental de punta a punta: pacientes, agenda, historia clínica, equipo de trabajo, facturación y comunicación — todo en un solo lugar.

## ✨ Funcionalidades

- 📋 **Pacientes e historia clínica** — fichas completas con odontograma y archivos adjuntos (OCR con Tesseract.js)
- 📅 **Agenda de turnos** — con sincronización bidireccional a **Google Calendar**
- 💬 **Mensajería por WhatsApp** — recordatorios y notificaciones vía WhatsApp Business API (Meta)
- 💳 **Suscripciones** — planes de pago recurrente con **MercadoPago**
- 📧 **Emails transaccionales** — con Resend
- 📊 **Dashboard** — métricas de la clínica con Recharts
- 🔐 **Multi-usuario** — roles de equipo, autenticación con Supabase Auth, RLS en base de datos

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript strict |
| UI | Tailwind CSS 4 · shadcn/ui · Framer Motion |
| Base de datos | Supabase (PostgreSQL + RLS + realtime) |
| Pagos | MercadoPago SDK |
| Integraciones | Google Calendar API · WhatsApp Business API · Gemini AI |
| Observabilidad | Sentry |
| Validación | React Hook Form + Zod 4 |

## 🏗️ Arquitectura

```
src/
├── app/
│   ├── (app)/        # Dashboard, agenda, pacientes (rutas protegidas)
│   ├── (auth)/       # Login, registro, recuperación
│   ├── (public)/     # Landing, pricing
│   ├── actions/      # Server Actions
│   └── api/          # Webhooks e integraciones
├── components/       # Componentes por feature + shadcn/ui
├── lib/              # Clientes Supabase, integraciones, seguridad, email
└── types/            # Tipos auto-generados de la DB
```

## 🚀 Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar credenciales de Supabase, MercadoPago, Resend y Google
npm run dev
```

---

*Proyecto en desarrollo activo — hecho por [Camila Santana](https://github.com/nexioartificial-hash)*
