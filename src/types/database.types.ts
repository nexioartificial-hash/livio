export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            bloqueo_horario: {
                Row: {
                    bloqueo_desde: string
                    bloqueo_hasta: string
                    created_at: string | null
                    descripcion: string | null
                    google_event_id: string | null
                    id: string
                    profesional_id: string | null
                    tipo: string | null
                }
                Insert: {
                    bloqueo_desde: string
                    bloqueo_hasta: string
                    created_at?: string | null
                    descripcion?: string | null
                    google_event_id?: string | null
                    id?: string
                    profesional_id?: string | null
                    tipo?: string | null
                }
                Update: {
                    bloqueo_desde?: string
                    bloqueo_hasta?: string
                    created_at?: string | null
                    descripcion?: string | null
                    google_event_id?: string | null
                    id?: string
                    profesional_id?: string | null
                    tipo?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "bloqueo_horario_profesional_id_fkey"
                        columns: ["profesional_id"]
                        isOneToOne: false
                        referencedRelation: "professional"
                        referencedColumns: ["id"]
                    },
                ]
            }
            bot_config: {
                Row: {
                    clinic_data: Json | null
                    clinica_id: string | null
                    created_at: string | null
                    hours: Json | null
                    id: string
                    quick_replies: string[] | null
                    style_guide: string | null
                    tone: string | null
                    updated_at: string | null
                }
                Insert: {
                    clinic_data?: Json | null
                    clinica_id?: string | null
                    created_at?: string | null
                    hours?: Json | null
                    id?: string
                    quick_replies?: string[] | null
                    style_guide?: string | null
                    tone?: string | null
                    updated_at?: string | null
                }
                Update: {
                    clinic_data?: Json | null
                    clinica_id?: string | null
                    created_at?: string | null
                    hours?: Json | null
                    id?: string
                    quick_replies?: string[] | null
                    style_guide?: string | null
                    tone?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "bot_config_clinica_id_fkey"
                        columns: ["clinica_id"]
                        isOneToOne: true
                        referencedRelation: "clinic"
                        referencedColumns: ["id"]
                    },
                ]
            }
            clinic: {
                Row: {
                    created_at: string | null
                    cuit: string | null
                    email: string | null
                    email_clinic: string | null
                    id: string
                    logo_url: string | null
                    name: string
                    owner_id: string | null
                    phone: string | null
                    plan_type: string | null
                    subscription_status: string | null
                    trial_ends_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    cuit?: string | null
                    email?: string | null
                    email_clinic?: string | null
                    id?: string
                    logo_url?: string | null
                    name: string
                    owner_id?: string | null
                    phone?: string | null
                    plan_type?: string | null
                    subscription_status?: string | null
                    trial_ends_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    cuit?: string | null
                    email?: string | null
                    email_clinic?: string | null
                    id?: string
                    logo_url?: string | null
                    name?: string
                    owner_id?: string | null
                    phone?: string | null
                    plan_type?: string | null
                    subscription_status?: string | null
                    trial_ends_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            clinical_record: {
                Row: {
                    created_at: string | null
                    id: string
                    notes: string | null
                    odontogram_state: Json | null
                    patient_id: string | null
                    professional_id: string | null
                    type: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                    odontogram_state?: Json | null
                    patient_id?: string | null
                    professional_id?: string | null
                    type?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                    odontogram_state?: Json | null
                    patient_id?: string | null
                    professional_id?: string | null
                    type?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "clinical_record_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patient"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "clinical_record_professional_id_fkey"
                        columns: ["professional_id"]
                        isOneToOne: false
                        referencedRelation: "professional"
                        referencedColumns: ["id"]
                    },
                ]
            }
            invites: {
                Row: {
                    clinic_id: string | null
                    created_at: string | null
                    email: string
                    id: string
                    inviter_id: string | null
                    inviter_name: string | null
                    role: Database["public"]["Enums"]["user_role"]
                    status: Database["public"]["Enums"]["invite_status"] | null
                    token: string | null
                    updated_at: string | null
                }
                Insert: {
                    clinic_id?: string | null
                    created_at?: string | null
                    email: string
                    id?: string
                    inviter_id?: string | null
                    inviter_name?: string | null
                    role?: Database["public"]["Enums"]["user_role"]
                    status?: Database["public"]["Enums"]["invite_status"] | null
                    token?: string | null
                    updated_at?: string | null
                }
                Update: {
                    clinic_id?: string | null
                    created_at?: string | null
                    email?: string
                    id?: string
                    inviter_id?: string | null
                    inviter_name?: string | null
                    role?: Database["public"]["Enums"]["user_role"]
                    status?: Database["public"]["Enums"]["invite_status"] | null
                    token?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "invites_clinic_id_fkey"
                        columns: ["clinic_id"]
                        isOneToOne: false
                        referencedRelation: "clinic"
                        referencedColumns: ["id"]
                    },
                ]
            }
            obras_sociales: {
                Row: {
                    activo: boolean | null
                    created_at: string | null
                    es_monotributo: boolean | null
                    id: string
                    nombre: string
                    rnas: string | null
                    slug_corto: string | null
                    tipo: string
                    updated_at: string | null
                }
                Insert: {
                    activo?: boolean | null
                    created_at?: string | null
                    es_monotributo?: boolean | null
                    id?: string
                    nombre: string
                    rnas?: string | null
                    slug_corto?: string | null
                    tipo: string
                    updated_at?: string | null
                }
                Update: {
                    activo?: boolean | null
                    created_at?: string | null
                    es_monotributo?: boolean | null
                    id?: string
                    nombre?: string
                    rnas?: string | null
                    slug_corto?: string | null
                    tipo?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            patient: {
                Row: {
                    birth_date: string | null
                    clinic_id: string | null
                    created_at: string | null
                    dni: string | null
                    email: string | null
                    full_name: string
                    gender: string | null
                    id: string
                    last_name: string | null
                    obra_social: string | null
                    obrasocial_id: string | null
                    phone: string | null
                    status: string | null
                    tags: string[] | null
                    updated_at: string | null
                }
                Insert: {
                    birth_date?: string | null
                    clinic_id?: string | null
                    created_at?: string | null
                    dni?: string | null
                    email?: string | null
                    full_name: string
                    gender?: string | null
                    id?: string
                    last_name?: string | null
                    obra_social?: string | null
                    obrasocial_id?: string | null
                    phone?: string | null
                    status?: string | null
                    tags?: string[] | null
                    updated_at?: string | null
                }
                Update: {
                    birth_date?: string | null
                    clinic_id?: string | null
                    created_at?: string | null
                    dni?: string | null
                    email?: string | null
                    full_name?: string
                    gender?: string | null
                    id?: string
                    last_name?: string | null
                    obra_social?: string | null
                    obrasocial_id?: string | null
                    phone?: string | null
                    status?: string | null
                    tags?: string[] | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "patient_obrasocial_id_fkey"
                        columns: ["obrasocial_id"]
                        isOneToOne: false
                        referencedRelation: "obras_sociales"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "patient_obrasocial_id_fkey"
                        columns: ["obrasocial_id"]
                        isOneToOne: false
                        referencedRelation: "vw_obras_sociales_search"
                        referencedColumns: ["id"]
                    },
                ]
            }
            professional: {
                Row: {
                    calendar_sync_enabled: boolean | null
                    clinic_id: string | null
                    created_at: string | null
                    full_name: string | null
                    google_access_token: string | null
                    google_calendar_id: string | null
                    google_refresh_token: string | null
                    google_token_expires_at: string | null
                    google_user_email: string | null
                    id: string
                    is_onboarded: boolean | null
                    license: string | null
                    role: Database["public"]["Enums"]["user_role"] | null
                    specialty: string | null
                    updated_at: string | null
                }
                Insert: {
                    calendar_sync_enabled?: boolean | null
                    clinic_id?: string | null
                    created_at?: string | null
                    full_name?: string | null
                    google_access_token?: string | null
                    google_calendar_id?: string | null
                    google_refresh_token?: string | null
                    google_token_expires_at?: string | null
                    google_user_email?: string | null
                    id: string
                    is_onboarded?: boolean | null
                    license?: string | null
                    role?: Database["public"]["Enums"]["user_role"] | null
                    specialty?: string | null
                    updated_at?: string | null
                }
                Update: {
                    calendar_sync_enabled?: boolean | null
                    clinic_id?: string | null
                    created_at?: string | null
                    full_name?: string | null
                    google_access_token?: string | null
                    google_calendar_id?: string | null
                    google_refresh_token?: string | null
                    google_token_expires_at?: string | null
                    google_user_email?: string | null
                    id?: string
                    is_onboarded?: boolean | null
                    license?: string | null
                    role?: Database["public"]["Enums"]["user_role"] | null
                    specialty?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            sucursal: {
                Row: {
                    aclaraciones: string | null
                    address: string | null
                    clinic_id: string | null
                    confirmAddress: boolean | null
                    created_at: string | null
                    email: string | null
                    google_maps_url: string | null
                    id: string
                    location: string | null
                    name: string
                    phone: string | null
                    updated_at: string | null
                }
                Insert: {
                    aclaraciones?: string | null
                    address?: string | null
                    clinic_id?: string | null
                    confirmAddress?: boolean | null
                    created_at?: string | null
                    email?: string | null
                    google_maps_url?: string | null
                    id?: string
                    location?: string | null
                    name: string
                    phone?: string | null
                    updated_at?: string | null
                }
                Update: {
                    aclaraciones?: string | null
                    address?: string | null
                    clinic_id?: string | null
                    confirmAddress?: boolean | null
                    created_at?: string | null
                    email?: string | null
                    google_maps_url?: string | null
                    id?: string
                    location?: string | null
                    name?: string
                    phone?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sucursal_clinic_id_fkey"
                        columns: ["clinic_id"]
                        isOneToOne: false
                        referencedRelation: "clinic"
                        referencedColumns: ["id"]
                    },
                ]
            }
            turno: {
                Row: {
                    clinic_id: string | null
                    created_at: string | null
                    date: string
                    duration: number | null
                    google_event_id: string | null
                    id: string
                    notes: string | null
                    obra_social: string | null
                    obrasocial_id: string | null
                    patient_id: string | null
                    patient_name: string
                    professional_id: string | null
                    professional_name: string
                    reason: string | null
                    source: string | null
                    status: string | null
                    sucursal: string | null
                    time: string
                    updated_at: string | null
                }
                Insert: {
                    clinic_id?: string | null
                    created_at?: string | null
                    date: string
                    duration?: number | null
                    google_event_id?: string | null
                    id?: string
                    notes?: string | null
                    obra_social?: string | null
                    obrasocial_id?: string | null
                    patient_id?: string | null
                    patient_name: string
                    professional_id?: string | null
                    professional_name: string
                    reason?: string | null
                    source?: string | null
                    status?: string | null
                    sucursal?: string | null
                    time: string
                    updated_at?: string | null
                }
                Update: {
                    clinic_id?: string | null
                    created_at?: string | null
                    date?: string
                    duration?: number | null
                    google_event_id?: string | null
                    id?: string
                    notes?: string | null
                    obra_social?: string | null
                    obrasocial_id?: string | null
                    patient_id?: string | null
                    patient_name?: string
                    professional_id?: string | null
                    professional_name?: string
                    reason?: string | null
                    source?: string | null
                    status?: string | null
                    sucursal?: string | null
                    time?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "turno_obrasocial_id_fkey"
                        columns: ["obrasocial_id"]
                        isOneToOne: false
                        referencedRelation: "obras_sociales"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "turno_obrasocial_id_fkey"
                        columns: ["obrasocial_id"]
                        isOneToOne: false
                        referencedRelation: "vw_obras_sociales_search"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "turno_patient_id_fkey"
                        columns: ["patient_id"]
                        isOneToOne: false
                        referencedRelation: "patient"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "turno_professional_id_fkey"
                        columns: ["professional_id"]
                        isOneToOne: false
                        referencedRelation: "professional"
                        referencedColumns: ["id"]
                    },
                ]
            }
            whatsapp_config: {
                Row: {
                    clinica_id: string | null
                    created_at: string | null
                    id: string
                    phone_id: string | null
                    phone_number: string | null
                    status: string | null
                    updated_at: string | null
                    ycloud_token: string | null
                }
                Insert: {
                    clinica_id?: string | null
                    created_at?: string | null
                    id?: string
                    phone_id?: string | null
                    phone_number?: string | null
                    status?: string | null
                    updated_at?: string | null
                    ycloud_token?: string | null
                }
                Update: {
                    clinica_id?: string | null
                    created_at?: string | null
                    id?: string
                    phone_id?: string | null
                    phone_number?: string | null
                    status?: string | null
                    updated_at?: string | null
                    ycloud_token?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "whatsapp_config_clinica_id_fkey"
                        columns: ["clinica_id"]
                        isOneToOne: true
                        referencedRelation: "clinic"
                        referencedColumns: ["id"]
                    },
                ]
            }
            whatsapp_messages: {
                Row: {
                    clinica_id: string | null
                    conversation_id: string
                    created_at: string | null
                    id: string
                    sender_id: string | null
                    status: string | null
                    text: string
                    type: string | null
                }
                Insert: {
                    clinica_id?: string | null
                    conversation_id: string
                    created_at?: string | null
                    id?: string
                    sender_id?: string | null
                    status?: string | null
                    text: string
                    type?: string | null
                }
                Update: {
                    clinica_id?: string | null
                    conversation_id?: string
                    created_at?: string | null
                    id?: string
                    sender_id?: string | null
                    status?: string | null
                    text?: string
                    type?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "whatsapp_messages_clinica_id_fkey"
                        columns: ["clinica_id"]
                        isOneToOne: false
                        referencedRelation: "clinic"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            vw_obras_sociales_search: {
                Row: {
                    es_monotributo: boolean | null
                    id: string | null
                    nombre: string | null
                    slug_corto: string | null
                    tipo: string | null
                }
                Insert: {
                    es_monotributo?: boolean | null
                    id?: string | null
                    nombre?: string | null
                    slug_corto?: string | null
                    tipo?: string | null
                }
                Update: {
                    es_monotributo?: boolean | null
                    id?: string | null
                    nombre?: string | null
                    slug_corto?: string | null
                    tipo?: string | null
                }
                Relationships: []
            }
        }
        Functions: {
            current_clinic_id: { Args: never; Returns: string }
            is_admin: { Args: never; Returns: boolean }
        }
        Enums: {
            invite_status: "pending" | "accepted" | "expired" | "cancelled"
            user_role: "superadmin" | "recepcionista" | "profesional"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
