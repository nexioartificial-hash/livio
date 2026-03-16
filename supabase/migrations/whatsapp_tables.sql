-- WhatsApp Business integration tables
-- Run in Supabase SQL Editor

create table if not exists user_whatsapps (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    clinic_id       uuid references clinic(id) on delete set null,
    waba_id         text not null,
    phone_id        text not null,
    display_number  text,
    verified_name   text,
    access_token    text,                        -- long-lived user token (encrypt in prod)
    status          text default 'active' check (status in ('active', 'inactive')),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now(),
    unique(user_id),
    unique(phone_id)
);

create table if not exists whatsapp_messages (
    id           uuid primary key default gen_random_uuid(),
    clinic_id    uuid references clinic(id) on delete set null,
    phone_id     text,
    wamid        text unique,                    -- WhatsApp message ID (idempotency)
    direction    text not null check (direction in ('inbound', 'outbound')),
    from_number  text,
    to_number    text,
    type         text default 'text',
    body         text,
    status       text,
    timestamp    timestamptz,
    raw_payload  jsonb,
    created_at   timestamptz default now()
);

-- Indexes
create index if not exists idx_user_whatsapps_user_id on user_whatsapps(user_id);
create index if not exists idx_user_whatsapps_phone_id on user_whatsapps(phone_id);
create index if not exists idx_whatsapp_messages_clinic_id on whatsapp_messages(clinic_id);
create index if not exists idx_whatsapp_messages_wamid on whatsapp_messages(wamid);

-- RLS
alter table user_whatsapps enable row level security;
alter table whatsapp_messages enable row level security;

create policy "Users manage own WA connection"
    on user_whatsapps for all
    using (auth.uid() = user_id);

create policy "Clinic members read WA messages"
    on whatsapp_messages for select
    using (
        clinic_id in (
            select clinic_id from professional where user_id = auth.uid()
        )
    );
