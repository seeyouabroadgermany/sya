
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["activity_kind"],"meta": NonNullable<Json>,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["activity_kind"],"meta"?: NonNullable<Json>,"student_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["activity_kind"],"meta"?: NonNullable<Json>,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_board"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "digest_enabled": boolean,"id": number,"round_robin_enabled": boolean,"round_robin_last_profile_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "digest_enabled"?: boolean,"id"?: number,"round_robin_enabled"?: boolean,"round_robin_last_profile_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "digest_enabled"?: boolean,"id"?: number,"round_robin_enabled"?: boolean,"round_robin_last_profile_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_round_robin_last_profile_id_fkey"
      columns: ["round_robin_last_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"document_types": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"name": string,"position": number,"required": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name": string,"position"?: number,"required"?: boolean
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name"?: string,"position"?: number,"required"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"lead_rate_limit": {
                  Row: {
                    "created_at": string,"id": number,"ip_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"ip_hash": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"ip_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"message_templates": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"name": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"name": string,"position"?: number
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"name"?: string,"position"?: number
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"currency": Database["public"]['Enums']["currency_code"],"due_date": string | null,"id": string,"kind": Database["public"]['Enums']["payment_kind"],"note": string | null,"paid_on": string | null,"status": Database["public"]['Enums']["payment_status"],"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"],"due_date"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["payment_kind"],"note"?: string | null,"paid_on"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"],"due_date"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["payment_kind"],"note"?: string | null,"paid_on"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_board"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string | null,"full_name": string,"id": string,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shortlist": {
                  Row: {
                    "course": string | null,"created_at": string,"id": string,"is_final": boolean,"student_id": string,"university_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course"?: string | null,"created_at"?: string,"id"?: string,"is_final"?: boolean,"student_id": string,"university_id": string
                  }
                  Update: {
                    "course"?: string | null,"created_at"?: string,"id"?: string,"is_final"?: boolean,"student_id"?: string,"university_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shortlist_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_board"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shortlist_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shortlist_university_id_fkey"
      columns: ["university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    }
                  ]
                },"stage_steps": {
                  Row: {
                    "active": boolean,"created_at": string,"fail_label": string | null,"id": string,"key": string | null,"kind": Database["public"]['Enums']["step_kind"],"label": string,"pass_label": string | null,"position": number,"required": boolean,"show_if_step_id": string | null,"show_if_value": string | null,"stage_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"fail_label"?: string | null,"id"?: string,"key"?: string | null,"kind"?: Database["public"]['Enums']["step_kind"],"label": string,"pass_label"?: string | null,"position": number,"required"?: boolean,"show_if_step_id"?: string | null,"show_if_value"?: string | null,"stage_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"fail_label"?: string | null,"id"?: string,"key"?: string | null,"kind"?: Database["public"]['Enums']["step_kind"],"label"?: string,"pass_label"?: string | null,"position"?: number,"required"?: boolean,"show_if_step_id"?: string | null,"show_if_value"?: string | null,"stage_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stage_steps_show_if_step_id_fkey"
      columns: ["show_if_step_id"]
isOneToOne: false
      referencedRelation: "stage_steps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stage_steps_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id"]
    }
                  ]
                },"stages": {
                  Row: {
                    "active": boolean,"country": string,"created_at": string,"id": string,"name": string,"position": number,"stuck_after_days": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"country"?: string,"created_at"?: string,"id"?: string,"name": string,"position": number,"stuck_after_days"?: number
                  }
                  Update: {
                    "active"?: boolean,"country"?: string,"created_at"?: string,"id"?: string,"name"?: string,"position"?: number,"stuck_after_days"?: number
                  }
                  Relationships: [
                    
                  ]
                },"student_documents": {
                  Row: {
                    "checked_by": string | null,"document_type_id": string,"status": Database["public"]['Enums']["doc_status"],"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_by"?: string | null,"document_type_id": string,"status"?: Database["public"]['Enums']["doc_status"],"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "checked_by"?: string | null,"document_type_id"?: string,"status"?: Database["public"]['Enums']["doc_status"],"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_documents_checked_by_fkey"
      columns: ["checked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_documents_document_type_id_fkey"
      columns: ["document_type_id"]
isOneToOne: false
      referencedRelation: "document_types"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_documents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_board"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_documents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"student_steps": {
                  Row: {
                    "done": boolean,"done_at": string | null,"done_by": string | null,"step_id": string,"student_id": string,"value": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "done"?: boolean,"done_at"?: string | null,"done_by"?: string | null,"step_id": string,"student_id": string,"value"?: string | null
                  }
                  Update: {
                    "done"?: boolean,"done_at"?: string | null,"done_by"?: string | null,"step_id"?: string,"student_id"?: string,"value"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_steps_done_by_fkey"
      columns: ["done_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_steps_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "stage_steps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_steps_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_board"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_steps_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "assigned_to": string | null,"budget_range": string | null,"city": string | null,"consent_at": string | null,"country": string,"course_interest": string | null,"created_at": string,"created_by": string | null,"current_stage_id": string | null,"drive_folder_url": string | null,"email": string | null,"full_name": string,"heard_about": Database["public"]['Enums']["lead_source"] | null,"id": string,"intake_month": number | null,"intake_year": number | null,"lead_source": Database["public"]['Enums']["lead_source"],"level": Database["public"]['Enums']["student_level"] | null,"lost_reason": string | null,"next_followup_on": string | null,"parent_name": string | null,"parent_phone": string | null,"phone": string | null,"referred_by": string | null,"stage_entered_at": string,"status": Database["public"]['Enums']["student_status"],"updated_at": string,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"budget_range"?: string | null,"city"?: string | null,"consent_at"?: string | null,"country"?: string,"course_interest"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_stage_id"?: string | null,"drive_folder_url"?: string | null,"email"?: string | null,"full_name": string,"heard_about"?: Database["public"]['Enums']["lead_source"] | null,"id"?: string,"intake_month"?: number | null,"intake_year"?: number | null,"lead_source"?: Database["public"]['Enums']["lead_source"],"level"?: Database["public"]['Enums']["student_level"] | null,"lost_reason"?: string | null,"next_followup_on"?: string | null,"parent_name"?: string | null,"parent_phone"?: string | null,"phone"?: string | null,"referred_by"?: string | null,"stage_entered_at"?: string,"status"?: Database["public"]['Enums']["student_status"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "assigned_to"?: string | null,"budget_range"?: string | null,"city"?: string | null,"consent_at"?: string | null,"country"?: string,"course_interest"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_stage_id"?: string | null,"drive_folder_url"?: string | null,"email"?: string | null,"full_name"?: string,"heard_about"?: Database["public"]['Enums']["lead_source"] | null,"id"?: string,"intake_month"?: number | null,"intake_year"?: number | null,"lead_source"?: Database["public"]['Enums']["lead_source"],"level"?: Database["public"]['Enums']["student_level"] | null,"lost_reason"?: string | null,"next_followup_on"?: string | null,"parent_name"?: string | null,"parent_phone"?: string | null,"phone"?: string | null,"referred_by"?: string | null,"stage_entered_at"?: string,"status"?: Database["public"]['Enums']["student_status"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_current_stage_id_fkey"
      columns: ["current_stage_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assigned_to": string,"created_at": string,"created_by": string | null,"done": boolean,"done_at": string | null,"due_on": string,"id": string,"student_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to": string,"created_at"?: string,"created_by"?: string | null,"done"?: boolean,"done_at"?: string | null,"due_on"?: string,"id"?: string,"student_id"?: string | null,"title": string
                  }
                  Update: {
                    "assigned_to"?: string,"created_at"?: string,"created_by"?: string | null,"done"?: boolean,"done_at"?: string | null,"due_on"?: string,"id"?: string,"student_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_board"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"universities": {
                  Row: {
                    "city": string | null,"country": string,"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"country"?: string,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "city"?: string | null,"country"?: string,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "student_board": {
                  Row: {
                    "assigned_to": string | null,"city": string | null,"counsellor_name": string | null,"country": string,"course_interest": string | null,"created_at": string,"current_stage_id": string | null,"days_in_stage": number | null,"docs_ready": number | null,"docs_total": number | null,"drive_folder_url": string | null,"email": string | null,"final_course": string | null,"final_university": string | null,"final_university_id": string | null,"followup_overdue": boolean | null,"full_name": string,"heard_about": Database["public"]['Enums']["lead_source"] | null,"id": string,"intake_month": number | null,"intake_year": number | null,"is_stuck": boolean | null,"lead_source": Database["public"]['Enums']["lead_source"],"level": Database["public"]['Enums']["student_level"] | null,"next_followup_on": string | null,"payments_pending": number | null,"phone": string | null,"stage_entered_at": string,"stage_name": string | null,"stage_position": number | null,"status": Database["public"]['Enums']["student_status"],"steps_done": number | null,"steps_total": number | null,"stuck_after_days": number | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "shortlist_university_id_fkey"
      columns: ["final_university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_current_stage_id_fkey"
      columns: ["current_stage_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id"]
    }
                  ]
                },"student_step_state": {
                  Row: {
                    "active": boolean,"complete": boolean | null,"done": boolean,"done_at": string | null,"done_by": string | null,"kind": Database["public"]['Enums']["step_kind"],"label": string,"position": number,"required": boolean,"stage_id": string,"step_id": string,"student_id": string,"value": string | null,"visible": boolean | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "stage_steps_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_steps_done_by_fkey"
      columns: ["done_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_steps_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "stage_steps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_steps_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_board"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_steps_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "can_access_student":
{ Args: { "p_student": string }; Returns: boolean
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lead_rate_limit_hit":
{ Args: { "p_ip_hash": string }; Returns: boolean
                           },
"mfa_code_needed":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"move_student_stage":
{ Args: { "p_note"?: string,"p_stage": string,"p_student": string }; Returns: undefined
                           },
"pick_round_robin":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"reorder_document_types":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"reorder_stages":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"reorder_steps":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"reorder_templates":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"stage_gate_missing":
{ Args: { "p_student": string,"p_target_stage": string }; Returns: {
              "label": string,"stage_name": string
            }[]
                           },
"step_complete":
{ Args: { "p_done": boolean,"p_kind": Database["public"]['Enums']["step_kind"],"p_value": string }; Returns: boolean
                           },
"today_ist":
{ Args: Record<PropertyKey, never>; Returns: string
                           }
          }
          Enums: {
            "activity_kind": "note"|"call"|"whatsapp"|"email"|"stage_change"|"step"|"payment"|"document"|"assignment"|"status"|"created","currency_code": "INR"|"CZK"|"EUR","doc_status": "pending"|"received"|"verified","lead_source": "instagram"|"referral"|"walk_in"|"website"|"whatsapp"|"other","payment_kind": "agency"|"university"|"nostrification"|"other","payment_status": "pending"|"paid","step_kind": "tick"|"yes_no"|"date"|"pass_fail"|"text","student_level": "bachelor"|"master","student_status": "active"|"on_hold"|"lost"|"completed","user_role": "admin"|"staff"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activity_kind": ["note", "call", "whatsapp", "email", "stage_change", "step", "payment", "document", "assignment", "status", "created"],"currency_code": ["INR", "CZK", "EUR"],"doc_status": ["pending", "received", "verified"],"lead_source": ["instagram", "referral", "walk_in", "website", "whatsapp", "other"],"payment_kind": ["agency", "university", "nostrification", "other"],"payment_status": ["pending", "paid"],"step_kind": ["tick", "yes_no", "date", "pass_fail", "text"],"student_level": ["bachelor", "master"],"student_status": ["active", "on_hold", "lost", "completed"],"user_role": ["admin", "staff"]
          }
        }
} as const
