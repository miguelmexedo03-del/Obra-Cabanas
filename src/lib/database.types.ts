export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apartamento_operario: {
        Row: {
          apartamento_id: number
          atribuido_em: string
          user_id: string
        }
        Insert: {
          apartamento_id: number
          atribuido_em?: string
          user_id: string
        }
        Update: {
          apartamento_id?: number
          atribuido_em?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartamento_operario_apartamento_id_fkey"
            columns: ["apartamento_id"]
            isOneToOne: false
            referencedRelation: "apartamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartamento_operario_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apartamentos: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          id: number
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          id: number
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          id: number
          registo_id: string
          tabela: string
          timestamp: string
          user_id: string | null
          valores_antigos: Json | null
          valores_novos: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          id?: number
          registo_id: string
          tabela: string
          timestamp?: string
          user_id?: string | null
          valores_antigos?: Json | null
          valores_novos?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          id?: number
          registo_id?: string
          tabela?: string
          timestamp?: string
          user_id?: string | null
          valores_antigos?: Json | null
          valores_novos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      divisoes: {
        Row: {
          apartamento_id: number
          id: number
          nome: string
          ordem: number
        }
        Insert: {
          apartamento_id: number
          id?: number
          nome: string
          ordem?: number
        }
        Update: {
          apartamento_id?: number
          id?: number
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "divisoes_apartamento_id_fkey"
            columns: ["apartamento_id"]
            isOneToOne: false
            referencedRelation: "apartamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      elementos: {
        Row: {
          apartamento_id: number
          concluido: boolean
          concluido_em: string | null
          concluido_por: string | null
          created_at: string
          data_prevista: string | null
          divisao_id: number | null
          elemento: string
          fase_id: number
          id: number
          notas: string | null
          responsavel: string | null
          sub_elemento: string | null
          updated_at: string
        }
        Insert: {
          apartamento_id: number
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          data_prevista?: string | null
          divisao_id?: number | null
          elemento: string
          fase_id: number
          id?: number
          notas?: string | null
          responsavel?: string | null
          sub_elemento?: string | null
          updated_at?: string
        }
        Update: {
          apartamento_id?: number
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          data_prevista?: string | null
          divisao_id?: number | null
          elemento?: string
          fase_id?: number
          id?: number
          notas?: string | null
          responsavel?: string | null
          sub_elemento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elementos_apartamento_id_fkey"
            columns: ["apartamento_id"]
            isOneToOne: false
            referencedRelation: "apartamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elementos_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elementos_divisao_id_fkey"
            columns: ["divisao_id"]
            isOneToOne: false
            referencedRelation: "divisoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elementos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
        ]
      }
      fases: {
        Row: {
          cor_hex: string
          duracao_dias_default: number
          id: number
          nome: string
          ordem: number
        }
        Insert: {
          cor_hex: string
          duracao_dias_default?: number
          id: number
          nome: string
          ordem: number
        }
        Update: {
          cor_hex?: string
          duracao_dias_default?: number
          id?: number
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          nome: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      tarefas_gantt: {
        Row: {
          apartamento_id: number
          created_at: string
          fase_id: number | null
          fim: string | null
          id: number
          inicio: string | null
          nivel: number
          nome: string
          notas: string | null
          parent_id: number | null
          responsavel_user_id: string | null
          status: Database["public"]["Enums"]["tarefa_status"]
          updated_at: string
        }
        Insert: {
          apartamento_id: number
          created_at?: string
          fase_id?: number | null
          fim?: string | null
          id?: number
          inicio?: string | null
          nivel?: number
          nome: string
          notas?: string | null
          parent_id?: number | null
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          updated_at?: string
        }
        Update: {
          apartamento_id?: number
          created_at?: string
          fase_id?: number | null
          fim?: string | null
          id?: number
          inicio?: string | null
          nivel?: number
          nome?: string
          notas?: string | null
          parent_id?: number | null
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["tarefa_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_gantt_apartamento_id_fkey"
            columns: ["apartamento_id"]
            isOneToOne: false
            referencedRelation: "apartamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_gantt_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_gantt_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_gantt_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tarefas_gantt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_gantt_responsavel_user_id_fkey"
            columns: ["responsavel_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kanban_cards: {
        Row: {
          apartamento_codigo: string | null
          apartamento_id: number | null
          fase_cor: string | null
          fase_id: number | null
          fase_nome: string | null
          fim: string | null
          id: number | null
          inicio: string | null
          nome: string | null
          progresso: number | null
          responsavel_nome: string | null
          responsavel_user_id: string | null
          status: Database["public"]["Enums"]["tarefa_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_gantt_apartamento_id_fkey"
            columns: ["apartamento_id"]
            isOneToOne: false
            referencedRelation: "apartamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_gantt_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_gantt_responsavel_user_id_fkey"
            columns: ["responsavel_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_por_apartamento: {
        Row: {
          apartamento_id: number | null
          concluidos: number | null
          percentagem: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elementos_apartamento_id_fkey"
            columns: ["apartamento_id"]
            isOneToOne: false
            referencedRelation: "apartamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_por_fase: {
        Row: {
          apartamento_id: number | null
          concluidos: number | null
          fase_id: number | null
          percentagem: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elementos_apartamento_id_fkey"
            columns: ["apartamento_id"]
            isOneToOne: false
            referencedRelation: "apartamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elementos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_operario_of: { Args: { ap_id: number }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      audit_action: "insert" | "update" | "delete"
      tarefa_status: "por_fazer" | "em_curso" | "bloqueado" | "concluido"
      user_role: "admin" | "encarregado" | "operario"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_action: ["insert", "update", "delete"],
      tarefa_status: ["por_fazer", "em_curso", "bloqueado", "concluido"],
      user_role: ["admin", "encarregado", "operario"],
    },
  },
} as const
