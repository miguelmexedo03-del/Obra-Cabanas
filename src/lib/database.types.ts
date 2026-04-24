// Generated manually from supabase/migrations/0001_schema.sql
// Replace with: supabase gen types typescript --linked > src/lib/database.types.ts
// after connecting to a Supabase project.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'encarregado' | 'operario'
export type TarefaStatus = 'por_fazer' | 'em_curso' | 'bloqueado' | 'concluido'
export type AuditAction = 'insert' | 'update' | 'delete'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          nome: string
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nome: string
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nome?: string
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      apartamentos: {
        Row: {
          id: number
          codigo: string
          descricao: string | null
          created_at: string
        }
        Insert: {
          id: number
          codigo: string
          descricao?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          codigo?: string
          descricao?: string | null
          created_at?: string
        }
      }
      apartamento_operario: {
        Row: {
          apartamento_id: number
          user_id: string
          atribuido_em: string
        }
        Insert: {
          apartamento_id: number
          user_id: string
          atribuido_em?: string
        }
        Update: {
          apartamento_id?: number
          user_id?: string
          atribuido_em?: string
        }
      }
      divisoes: {
        Row: {
          id: number
          apartamento_id: number
          nome: string
          ordem: number
        }
        Insert: {
          id?: number
          apartamento_id: number
          nome: string
          ordem?: number
        }
        Update: {
          id?: number
          apartamento_id?: number
          nome?: string
          ordem?: number
        }
      }
      elementos: {
        Row: {
          id: number
          apartamento_id: number
          divisao_id: number | null
          fase_id: number
          elemento: string
          sub_elemento: string | null
          concluido: boolean
          concluido_em: string | null
          concluido_por: string | null
          notas: string | null
          responsavel: string | null
          data_prevista: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          apartamento_id: number
          divisao_id?: number | null
          fase_id: number
          elemento: string
          sub_elemento?: string | null
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          notas?: string | null
          responsavel?: string | null
          data_prevista?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          apartamento_id?: number
          divisao_id?: number | null
          fase_id?: number
          elemento?: string
          sub_elemento?: string | null
          concluido?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          notas?: string | null
          responsavel?: string | null
          data_prevista?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fases: {
        Row: {
          id: number
          nome: string
          ordem: number
          cor_hex: string
          duracao_dias_default: number
        }
        Insert: {
          id: number
          nome: string
          ordem: number
          cor_hex: string
          duracao_dias_default?: number
        }
        Update: {
          id?: number
          nome?: string
          ordem?: number
          cor_hex?: string
          duracao_dias_default?: number
        }
      }
      tarefas_gantt: {
        Row: {
          id: number
          parent_id: number | null
          apartamento_id: number
          fase_id: number | null
          nivel: number
          nome: string
          inicio: string | null
          fim: string | null
          status: TarefaStatus
          responsavel_user_id: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          parent_id?: number | null
          apartamento_id: number
          fase_id?: number | null
          nivel?: number
          nome: string
          inicio?: string | null
          fim?: string | null
          status?: TarefaStatus
          responsavel_user_id?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          parent_id?: number | null
          apartamento_id?: number
          fase_id?: number | null
          nivel?: number
          nome?: string
          inicio?: string | null
          fim?: string | null
          status?: TarefaStatus
          responsavel_user_id?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: number
          user_id: string | null
          tabela: string
          registo_id: string
          action: AuditAction
          valores_antigos: Json | null
          valores_novos: Json | null
          timestamp: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          tabela: string
          registo_id: string
          action: AuditAction
          valores_antigos?: Json | null
          valores_novos?: Json | null
          timestamp?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          tabela?: string
          registo_id?: string
          action?: AuditAction
          valores_antigos?: Json | null
          valores_novos?: Json | null
          timestamp?: string
        }
      }
    }
    Views: {
      progresso_por_fase: {
        Row: {
          apartamento_id: number
          fase_id: number
          total: number
          concluidos: number
          percentagem: number
        }
      }
      progresso_por_apartamento: {
        Row: {
          apartamento_id: number
          total: number
          concluidos: number
          percentagem: number
        }
      }
      kanban_cards: {
        Row: {
          id: number
          apartamento_id: number
          apartamento_codigo: string
          fase_id: number
          fase_nome: string
          fase_cor: string
          nome: string
          inicio: string | null
          fim: string | null
          status: TarefaStatus
          responsavel_user_id: string | null
          responsavel_nome: string | null
          progresso: number
        }
      }
    }
    Functions: {
      current_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      is_operario_of: {
        Args: { ap_id: number }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      tarefa_status: TarefaStatus
      audit_action: AuditAction
    }
  }
}
