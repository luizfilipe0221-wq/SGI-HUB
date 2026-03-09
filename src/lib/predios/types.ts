export interface Predio {
  id: number;
  nome: string;
  endereco: string | null;
  territorio: string | null;
  andares: string | null;
  aptos_por_andar: string | null;
  total_aptos: number;
  observacoes: string | null;
  cartas_entregues_historico: string | null;
  lista_original: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface Lote {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  finalizado: boolean;
  criado_em: string;
  finalizado_em: string | null;
}

export interface LotePredio {
  id: number;
  lote_id: number;
  predio_id: number;
  meta_cartas: number;
  cartas_entregues: number;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pendente';
  concluido_manualmente: boolean;
  criado_em: string;
  concluido_em: string | null;
}

export interface Entrega {
  id: number;
  lote_predio_id: number;
  apartamento: string;
  entregue: boolean;
  observacao: string | null;
  entregue_em: string;
}

export interface AuditoriaPredio {
  id: number;
  predio_id: number;
  campo: string;
  valor_antigo: string | null;
  valor_novo: string | null;
  alterado_em: string;
}

// ==============
// Views
// ==============

export interface PainelLoteRow {
  lote_id: number;
  lote_nome: string;
  ativo: boolean;
  finalizado: boolean;
  lote_predio_id: number;
  meta_cartas: number;
  cartas_entregues: number;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pendente';
  concluido_em: string | null;
  predio_id: number;
  predio_nome: string;
  endereco: string | null;
  territorio: string | null;
  total_aptos: number;
  andares: string | null;
  aptos_por_andar: string | null;
  observacoes: string | null;
  progresso_pct: number;
  excedeu_meta: boolean;
}

export interface EstatisticasLoteRow {
  lote_id: number;
  lote_nome: string;
  ativo: boolean;
  finalizado: boolean;
  total_predios: number;
  concluidos: number;
  em_andamento: number;
  nao_iniciados: number;
  pendentes: number;
  total_cartas_entregues: number;
  total_meta_cartas: number;
  progresso_geral_pct: number;
}

export interface PredioPendenteRow {
  id: number;
  nome: string;
  endereco: string | null;
  territorio: string | null;
  total_aptos: number;
  vezes_na_lista: number;
  ultima_vez_em: string | null;
  tem_pendencia: boolean | null;
}
