import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { BarChart2, ChevronLeft, ChevronRight, Pencil, Loader2 } from "lucide-react";

const statusBadgeClass: Record<string, string> = {
  atendeu: "status-badge-atendeu",
  "nao-atendeu": "status-badge-nao-atendeu",
  "caixa-postal": "status-badge-caixa-postal",
  invalido: "status-badge-invalido",
  "nao-quer": "status-badge-nao-quer",
  retornar: "status-badge-retornar",
  revisita: "status-badge-revisita",
  pendente: "status-badge-pendente",
};

const statusLabels: Record<string, string> = {
  atendeu: "Atendeu",
  "nao-atendeu": "Não Atendeu",
  "caixa-postal": "Caixa Postal",
  invalido: "Número Inválido",
  "nao-quer": "Não Quer Contato",
  retornar: "Retornar Depois",
  revisita: "Revisita",
  pendente: "Pendente",
};

const PAGE_SIZE = 25;

interface Resultado {
  lista_contato_id: number | null;
  contato_nome: string | null;
  telefone: string | null;
  territorio: string | null;
  nome_operador: string | null;
  ultimo_status: string | null;
  ultima_obs: string | null;
  ultimo_horario_retorno: string | null;
  ultima_ligacao_em: string | null;
  total_tentativas: number | null;
}

interface EditState {
  row: Resultado;
  status: string;
  observacao: string;
  horario_retorno: string;
}

export function ResultsTab() {
  const [results, setResults] = useState<Resultado[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOperador, setFilterOperador] = useState("");
  const [filterTerritorio, setFilterTerritorio] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Edit modal
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadResults(); }, []);

  async function loadResults() {
    setLoading(true);
    const { data } = await supabase.from("painel_resultados").select("*");
    setResults((data as Resultado[]) || []);
    setLoading(false);
  }

  function openEdit(row: Resultado) {
    setEditState({
      row,
      status: row.ultimo_status || "pendente",
      observacao: row.ultima_obs || "",
      horario_retorno: row.ultimo_horario_retorno || "",
    });
  }

  async function salvarEdicao() {
    if (!editState || !editState.row.lista_contato_id) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_salvar_registro", {
        p_lista_contato_id: editState.row.lista_contato_id,
        p_status: editState.status,
        p_observacao: editState.observacao.trim() || null,
        p_horario_retorno: editState.status === "retornar" && editState.horario_retorno
          ? editState.horario_retorno
          : null,
      });

      if (error) throw error;

      toast({ title: "Salvo!", description: "Registro atualizado com sucesso." });
      setEditState(null);
      await loadResults();
    } catch (err: any) {
      console.error("Erro ao salvar registro:", err);
      toast({ title: "Erro", description: err?.message || "Falha ao salvar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const filtered = results.filter((r) => {
    if (filterStatus && filterStatus !== "all" && r.ultimo_status !== filterStatus) return false;
    if (filterOperador && !r.nome_operador?.toLowerCase().includes(filterOperador.toLowerCase())) return false;
    if (filterTerritorio && filterTerritorio !== "all" && r.territorio !== filterTerritorio) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 text-center">
          <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Nenhuma ligação registrada ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={filterOperador} onChange={(e) => { setFilterOperador(e.target.value); setPage(0); }} placeholder="Filtrar operador" />
        <Select value={filterTerritorio} onValueChange={(v) => { setFilterTerritorio(v); setPage(0); }}>
          <SelectTrigger><SelectValue placeholder="Território" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Array.from({ length: 32 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Território</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Retorno</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tent.</TableHead>
                <TableHead className="text-center">Editar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.contato_nome}</TableCell>
                  <TableCell className="text-muted-foreground">{r.telefone}</TableCell>
                  <TableCell>{r.territorio}</TableCell>
                  <TableCell>{r.nome_operador}</TableCell>
                  <TableCell>
                    <Badge className={`${statusBadgeClass[r.ultimo_status || ""] || "status-badge-pendente"} border-0`}>
                      {statusLabels[r.ultimo_status || ""] || r.ultimo_status || "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-muted-foreground">{r.ultima_obs}</TableCell>
                  <TableCell className="text-muted-foreground">{r.ultimo_horario_retorno || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.ultima_ligacao_em ? new Date(r.ultima_ligacao_em).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-center">{r.total_tentativas ?? 0}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(r)}
                      disabled={!r.lista_contato_id}
                      title="Editar resultado"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modal de edição */}
      <Dialog open={!!editState} onOpenChange={(o) => { if (!o) setEditState(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Resultado</DialogTitle>
            {editState && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{editState.row.contato_nome}</span>
                {" · "}{editState.row.nome_operador}
              </p>
            )}
          </DialogHeader>

          {editState && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editState.status}
                  onValueChange={(v) => setEditState({ ...editState, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={editState.observacao}
                  onChange={(e) => setEditState({ ...editState, observacao: e.target.value })}
                  placeholder="Observação opcional..."
                  rows={3}
                />
              </div>

              {editState.status === "retornar" && (
                <div className="space-y-2">
                  <Label>Horário de retorno</Label>
                  <Input
                    type="datetime-local"
                    value={editState.horario_retorno}
                    onChange={(e) => setEditState({ ...editState, horario_retorno: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditState(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
