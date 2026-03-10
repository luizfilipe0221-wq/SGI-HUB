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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          criado_em: string | null
          email: string
          id: number
          nome: string
          senha_hash: string
        }
        Insert: {
          criado_em?: string | null
          email: string
          id?: number
          nome: string
          senha_hash: string
        }
        Update: {
          criado_em?: string | null
          email?: string
          id?: number
          nome?: string
          senha_hash?: string
        }
        Relationships: []
      }
      auditoria_contatos: {
        Row: {
          alterado_em: string | null
          campo: string
          contato_id: number
          id: number
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_em?: string | null
          campo: string
          contato_id: number
          id?: number
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_em?: string | null
          campo?: string
          contato_id?: number
          id?: number
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      auditoria_predios: {
        Row: {
          alterado_em: string | null
          campo: string
          id: number
          predio_id: number
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_em?: string | null
          campo: string
          id?: number
          predio_id: number
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_em?: string | null
          campo?: string
          id?: number
          predio_id?: number
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      contatos: {
        Row: {
          criado_em: string | null
          endereco: string | null
          id: number
          nome: string | null
          obs_original: string | null
          telefone: string
          territorio: string | null
          tipo: string | null
        }
        Insert: {
          criado_em?: string | null
          endereco?: string | null
          id?: number
          nome?: string | null
          obs_original?: string | null
          telefone: string
          territorio?: string | null
          tipo?: string | null
        }
        Update: {
          criado_em?: string | null
          endereco?: string | null
          id?: number
          nome?: string | null
          obs_original?: string | null
          telefone?: string
          territorio?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      contatos_backup_telefones: {
        Row: {
          backup_em: string | null
          id: number | null
          telefone: string | null
        }
        Insert: {
          backup_em?: string | null
          id?: number | null
          telefone?: string | null
        }
        Update: {
          backup_em?: string | null
          id?: number | null
          telefone?: string | null
        }
        Relationships: []
      }
      entregas: {
        Row: {
          apartamento: string
          entregue: boolean | null
          entregue_em: string | null
          id: number
          lote_predio_id: number
          observacao: string | null
        }
        Insert: {
          apartamento: string
          entregue?: boolean | null
          entregue_em?: string | null
          id?: number
          lote_predio_id: number
          observacao?: string | null
        }
        Update: {
          apartamento?: string
          entregue?: boolean | null
          entregue_em?: string | null
          id?: number
          lote_predio_id?: number
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_lote_predio_id_fkey"
            columns: ["lote_predio_id"]
            isOneToOne: false
            referencedRelation: "lote_predios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_lote_predio_id_fkey"
            columns: ["lote_predio_id"]
            isOneToOne: false
            referencedRelation: "painel_lote"
            referencedColumns: ["lote_predio_id"]
          },
        ]
      }
      lista_contatos: {
        Row: {
          contato_id: number
          criado_em: string | null
          id: number
          link_ativo: boolean | null
          lista_id: number
          nome_operador: string | null
          ordem: number | null
          token_operador: string
          total_tentativas: number | null
          ultima_tentativa_em: string | null
          ultimo_status: string | null
        }
        Insert: {
          contato_id: number
          criado_em?: string | null
          id?: number
          link_ativo?: boolean | null
          lista_id: number
          nome_operador?: string | null
          ordem?: number | null
          token_operador?: string
          total_tentativas?: number | null
          ultima_tentativa_em?: string | null
          ultimo_status?: string | null
        }
        Update: {
          contato_id?: number
          criado_em?: string | null
          id?: number
          link_ativo?: boolean | null
          lista_id?: number
          nome_operador?: string | null
          ordem?: number | null
          token_operador?: string
          total_tentativas?: number | null
          ultima_tentativa_em?: string | null
          ultimo_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_contatos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_contatos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "fila_retornos"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "lista_contatos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "historico_contato"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "lista_contatos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "painel_resultados"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "lista_contatos_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "estatisticas_lista"
            referencedColumns: ["lista_id"]
          },
          {
            foreignKeyName: "lista_contatos_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_contatos_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "painel_resultados"
            referencedColumns: ["lista_id"]
          },
        ]
      }
      listas: {
        Row: {
          ativa: boolean | null
          criado_em: string | null
          descricao: string | null
          id: number
          nome: string
          token_gestor: string
        }
        Insert: {
          ativa?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: number
          nome: string
          token_gestor?: string
        }
        Update: {
          ativa?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: number
          nome?: string
          token_gestor?: string
        }
        Relationships: []
      }
      lote_predios: {
        Row: {
          cartas_entregues: number | null
          concluido_em: string | null
          concluido_manualmente: boolean | null
          criado_em: string | null
          id: number
          lote_id: number
          meta_cartas: number | null
          predio_id: number
          status: string | null
        }
        Insert: {
          cartas_entregues?: number | null
          concluido_em?: string | null
          concluido_manualmente?: boolean | null
          criado_em?: string | null
          id?: number
          lote_id: number
          meta_cartas?: number | null
          predio_id: number
          status?: string | null
        }
        Update: {
          cartas_entregues?: number | null
          concluido_em?: string | null
          concluido_manualmente?: boolean | null
          criado_em?: string | null
          id?: number
          lote_id?: number
          meta_cartas?: number | null
          predio_id?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_predios_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "estatisticas_lote"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "lote_predios_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_predios_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "painel_lote"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "lote_predios_predio_id_fkey"
            columns: ["predio_id"]
            isOneToOne: false
            referencedRelation: "painel_lote"
            referencedColumns: ["predio_id"]
          },
          {
            foreignKeyName: "lote_predios_predio_id_fkey"
            columns: ["predio_id"]
            isOneToOne: false
            referencedRelation: "predios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_predios_predio_id_fkey"
            columns: ["predio_id"]
            isOneToOne: false
            referencedRelation: "predios_pendentes"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          descricao: string | null
          finalizado: boolean | null
          finalizado_em: string | null
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          finalizado?: boolean | null
          finalizado_em?: string | null
          id?: number
          nome: string
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          finalizado?: boolean | null
          finalizado_em?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      predios: {
        Row: {
          andares: string | null
          aptos_por_andar: string | null
          ativo: boolean | null
          cartas_entregues_historico: string | null
          criado_em: string | null
          endereco: string | null
          id: number
          lista_original: number | null
          nome: string
          observacoes: string | null
          territorio: string | null
          total_aptos: number | null
        }
        Insert: {
          andares?: string | null
          aptos_por_andar?: string | null
          ativo?: boolean | null
          cartas_entregues_historico?: string | null
          criado_em?: string | null
          endereco?: string | null
          id?: number
          lista_original?: number | null
          nome: string
          observacoes?: string | null
          territorio?: string | null
          total_aptos?: number | null
        }
        Update: {
          andares?: string | null
          aptos_por_andar?: string | null
          ativo?: boolean | null
          cartas_entregues_historico?: string | null
          criado_em?: string | null
          endereco?: string | null
          id?: number
          lista_original?: number | null
          nome?: string
          observacoes?: string | null
          territorio?: string | null
          total_aptos?: number | null
        }
        Relationships: []
      }
      registros: {
        Row: {
          criado_em: string | null
          horario_retorno: string | null
          id: number
          lista_contato_id: number
          observacao: string | null
          status: string
        }
        Insert: {
          criado_em?: string | null
          horario_retorno?: string | null
          id?: number
          lista_contato_id: number
          observacao?: string | null
          status: string
        }
        Update: {
          criado_em?: string | null
          horario_retorno?: string | null
          id?: number
          lista_contato_id?: number
          observacao?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_lista_contato_id_fkey"
            columns: ["lista_contato_id"]
            isOneToOne: false
            referencedRelation: "lista_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_lista_contato_id_fkey"
            columns: ["lista_contato_id"]
            isOneToOne: false
            referencedRelation: "painel_resultados"
            referencedColumns: ["lista_contato_id"]
          },
        ]
      }
    }
    Views: {
      estatisticas_lista: {
        Row: {
          atendeu: number | null
          caixa_postal: number | null
          invalido: number | null
          lista_id: number | null
          lista_nome: string | null
          nao_atendeu: number | null
          nao_quer: number | null
          pendentes: number | null
          retornar: number | null
          revisita: number | null
          total_contatos: number | null
        }
        Relationships: []
      }
      estatisticas_lote: {
        Row: {
          ativo: boolean | null
          concluidos: number | null
          em_andamento: number | null
          finalizado: boolean | null
          lote_id: number | null
          lote_nome: string | null
          nao_iniciados: number | null
          pendentes: number | null
          progresso_geral_pct: number | null
          total_cartas_entregues: number | null
          total_meta_cartas: number | null
          total_predios: number | null
        }
        Relationships: []
      }
      fila_retornos: {
        Row: {
          contato_id: number | null
          contato_nome: string | null
          dias_em_aberto: number | null
          endereco: string | null
          horario_retorno: string | null
          lista_nome: string | null
          nome_operador: string | null
          observacao: string | null
          registrado_em: string | null
          telefone: string | null
          territorio: string | null
          token_operador: string | null
          total_tentativas: number | null
        }
        Relationships: []
      }
      historico_contato: {
        Row: {
          contato_id: number | null
          contato_nome: string | null
          data_ligacao: string | null
          horario_retorno: string | null
          lista_nome: string | null
          nome_operador: string | null
          observacao: string | null
          status: string | null
          telefone: string | null
        }
        Relationships: []
      }
      painel_lote: {
        Row: {
          andares: string | null
          aptos_por_andar: string | null
          ativo: boolean | null
          cartas_entregues: number | null
          concluido_em: string | null
          endereco: string | null
          excedeu_meta: boolean | null
          finalizado: boolean | null
          lote_id: number | null
          lote_nome: string | null
          lote_predio_id: number | null
          meta_cartas: number | null
          observacoes: string | null
          predio_id: number | null
          predio_nome: string | null
          progresso_pct: number | null
          status: string | null
          territorio: string | null
          total_aptos: number | null
        }
        Relationships: []
      }
      painel_resultados: {
        Row: {
          contato_id: number | null
          contato_nome: string | null
          endereco: string | null
          link_ativo: boolean | null
          lista_contato_id: number | null
          lista_id: number | null
          lista_nome: string | null
          nome_operador: string | null
          telefone: string | null
          territorio: string | null
          tipo: string | null
          total_tentativas: number | null
          ultima_ligacao_em: string | null
          ultima_obs: string | null
          ultimo_horario_retorno: string | null
          ultimo_status: string | null
        }
        Relationships: []
      }
      predios_pendentes: {
        Row: {
          endereco: string | null
          id: number | null
          nome: string | null
          tem_pendencia: boolean | null
          territorio: string | null
          total_aptos: number | null
          ultima_vez_em: string | null
          vezes_na_lista: number | null
        }
        Relationships: []
      }
      relatorio_territorio: {
        Row: {
          atenderam: number | null
          invalidos: number | null
          ja_trabalhados: number | null
          nao_atenderam: number | null
          nao_querem: number | null
          pendentes: number | null
          retornar: number | null
          territorio: string | null
          total_contatos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      verificar_login: {
        Args: { p_email: string; p_senha: string }
        Returns: {
          autenticado: boolean
          email: string
          id: number
          nome: string
        }[]
      }
      criar_lista_completa: {
        Args: {
          p_nome: string
          p_descricao: string
          p_contatos: Json
          p_ativa?: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
