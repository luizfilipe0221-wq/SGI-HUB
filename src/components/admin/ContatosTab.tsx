import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Phone, Search, Loader2, Save, ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseQuery } from "@/lib/supabaseHelper";

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
  invalido: "Inválido",
  "nao-quer": "Não Quer",
  retornar: "Retornar",
  revisita: "Revisita",
  pendente: "Pendente",
};

// Status que podem ser inseridos no banco (sem "pendente" — estado virtual)
const statusEditaveis: Record<string, string> = {
  atendeu: "Atendeu",
  "nao-atendeu": "Não Atendeu",
  "caixa-postal": "Caixa Postal",
  invalido: "Inválido",
  "nao-quer": "Não Quer",
  retornar: "Retornar",
  revisita: "Revisita",
};

interface Contato {
  id: number;
  nome: string | null;
  telefone: string;
  endereco: string | null;
  tipo: string | null;
  territorio: string | null;
  obs_original: string | null;
  total_ligacoes: number;
  ultimo_status: string | null;
}

interface HistoricoItem {
  data_ligacao: string | null;
  lista_nome: string | null;
  nome_operador: string | null;
  status: string | null;
  observacao: string | null;
  horario_retorno: string | null;
  lista_contato_id: number | null;
}

interface ContatosTabProps {
  initialStatusFilter?: string;
}

const PAGE_SIZE = 25;

export function ContatosTab({ initialStatusFilter }: ContatosTabProps) {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTerritorio, setFilterTerritorio] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterStatus, setFilterStatus] = useState(initialStatusFilter || "all");
  const [page, setPage] = useState(0);

  // Drawer state
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editEndereco, setEditEndereco] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [editTerritorio, setEditTerritorio] = useState("");
  const [editObs, setEditObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [editingHistIdx, setEditingHistIdx] = useState<number | null>(null);
  const [editingHistStatus, setEditingHistStatus] = useState("");
  const [savingHist, setSavingHist] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    // Get all contatos
    const { data: contatosData } = await supabase
      .from("contatos")
      .select("id, nome, telefone, endereco, tipo, territorio, obs_original")
      .order("id");

    // Get stats from painel_resultados
    const { data: painelData } = await supabase
      .from("painel_resultados")
      .select("contato_id, ultimo_status, total_tentativas");

    const statsMap = new Map<number, { total: number; status: string | null }>();
    (painelData || []).forEach((p) => {
      if (p.contato_id) {
        const existing = statsMap.get(p.contato_id);
        if (existing) {
          existing.total += Number(p.total_tentativas || 0);
        } else {
          statsMap.set(p.contato_id, {
            total: Number(p.total_tentativas || 0),
            status: p.ultimo_status,
          });
        }
      }
    });

    const mapped: Contato[] = (contatosData || []).map((c) => {
      const s = statsMap.get(c.id);
      return {
        ...c,
        total_ligacoes: s?.total || 0,
        ultimo_status: s?.status || null,
      };
    });

    setContatos(mapped);
    setLoading(false);
  }

  const tipos = useMemo(() => {
    const set = new Set<string>();
    contatos.forEach((c) => { if (c.tipo) set.add(c.tipo); });
    return Array.from(set).sort();
  }, [contatos]);

  const filtered = useMemo(() => {
    return contatos.filter((c) => {
      if (search) {
        const s = search.toLowerCase();
        if (!(c.nome?.toLowerCase().includes(s) || c.telefone?.toLowerCase().includes(s))) return false;
      }
      if (filterTerritorio !== "all" && c.territorio !== filterTerritorio) return false;
      if (filterTipo !== "all" && c.tipo !== filterTipo) return false;
      if (filterStatus !== "all") {
        if (filterStatus === "pendente") {
          if (c.ultimo_status) return false;
        } else if (c.ultimo_status !== filterStatus) return false;
      }
      return true;
    });
  }, [contatos, search, filterTerritorio, filterTipo, filterStatus]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, filterTerritorio, filterTipo, filterStatus]);

  function openDrawer(contato: Contato) {
    setSelectedContato(contato);
    setEditNome(contato.nome || "");
    setEditTelefone(contato.telefone || "");
    setEditEndereco(contato.endereco || "");
    setEditTipo(contato.tipo || "");
    setEditTerritorio(contato.territorio || "");
    setEditObs(contato.obs_original || "");
    loadHistorico(contato.id);
  }

  async function loadHistorico(contatoId: number) {
    setLoadingHistorico(true);
    // Também buscamos lista_contato_id via painel_resultados para poder editar
    const [{ data: histData }, { data: painelData }] = await Promise.all([
      supabase.from("historico_contato").select("*").eq("contato_id", contatoId),
      supabase.from("painel_resultados").select("lista_contato_id, lista_id").eq("contato_id", contatoId),
    ]);
    const lcIdSet = new Set((painelData || []).map((p) => p.lista_contato_id));
    // Para cada item de histórico, tentamos associar um lista_contato_id (melhor esforço)
    const lcIdArr = [...lcIdSet].filter(Boolean) as number[];
    setHistorico(
      (histData || [])
        .sort((a, b) => new Date(b.data_ligacao || 0).getTime() - new Date(a.data_ligacao || 0).getTime())
        .map((h, idx) => ({
          ...h,
          lista_contato_id: lcIdArr[idx] ?? lcIdArr[0] ?? null,
        }))
    );
    setLoadingHistorico(false);
  }

  async function salvarEdicaoHistorico(item: HistoricoItem, novoStatus: string) {
    if (!item.lista_contato_id) {
      toast({ title: "Não foi possível editar", description: "ID do contato na lista não encontrado.", variant: "destructive" });
      return;
    }
    setSavingHist(true);
    await supabaseQuery(async () => await supabase.rpc("admin_salvar_registro", {
            p_lista_contato_id: item.lista_contato_id,
            p_status: novoStatus,
            p_observacao: item.observacao || null,
            p_horario_retorno: novoStatus === "retornar" ? item.horario_retorno || null : null,
          }));
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      setEditingHistIdx(null);
      if (selectedContato) loadHistorico(selectedContato.id);
    }
    setSavingHist(false);
  }

  async function saveContato() {
    if (!selectedContato) return;
    setSaving(true);
    await supabaseQuery(async () => await supabase.rpc("admin_update_contato", {
            p_contato_id: selectedContato.id,
            p_nome: editNome.trim() || null,
            p_telefone: editTelefone.trim(),
            p_endereco: editEndereco.trim() || null,
            p_tipo: editTipo.trim() || null,
            p_territorio: editTerritorio.trim() || null,
            p_obs_original: editObs.trim() || null,
          }));

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Contato atualizado com sucesso." });
      loadData();
    }
    setSaving(false);
  }

  function parsePhones(telefone: string): string[] {
    return telefone.split(/[|/,]/).map((t) => t.trim()).filter(Boolean);
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome ou telefone..."
            className="pl-9"
          />
        </div>
        <Select value={filterTerritorio} onValueChange={setFilterTerritorio}>
          <SelectTrigger><SelectValue placeholder="Território" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Territórios</SelectItem>
            {Array.from({ length: 32 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} contatos encontrados</p>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Endereço</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Terr.</TableHead>
                <TableHead>Ligações</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => openDrawer(c)}>
                  <TableCell className="font-medium max-w-[180px] truncate">{c.nome || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {parsePhones(c.telefone).map((p, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary/20 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${p.replace(/\D/g, "")}`, "_self");
                          }}
                        >
                          <Phone className="h-3 w-3 mr-1" />{p}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[150px] truncate">
                    {c.endereco || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.tipo || "—"}</TableCell>
                  <TableCell>{c.territorio || "—"}</TableCell>
                  <TableCell className="text-center">{c.total_ligacoes}</TableCell>
                  <TableCell>
                    {c.ultimo_status ? (
                      <Badge className={`${statusBadgeClass[c.ultimo_status] || "status-badge-pendente"} border-0 text-xs`}>
                        {statusLabels[c.ultimo_status] || c.ultimo_status}
                      </Badge>
                    ) : (
                      <Badge className="status-badge-pendente border-0 text-xs">Pendente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum contato encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Drawer */}
      <Sheet open={!!selectedContato} onOpenChange={(o) => !o && setSelectedContato(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-syne">{selectedContato?.nome || "Contato"}</SheetTitle>
          </SheetHeader>
          {selectedContato && (
            <div className="space-y-6 mt-6">
              {/* Edit form */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Endereço</Label>
                  <Input value={editEndereco} onChange={(e) => setEditEndereco(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Input value={editTipo} onChange={(e) => setEditTipo(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Território</Label>
                    <Input value={editTerritorio} onChange={(e) => setEditTerritorio(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Observação original</Label>
                  <Textarea value={editObs} onChange={(e) => setEditObs(e.target.value)} rows={2} />
                </div>
                <Button onClick={saveContato} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar alterações
                </Button>
              </div>

              {/* History */}
              <div className="space-y-3">
                <h3 className="font-syne font-semibold text-sm">Histórico de Ligações</h3>
                {loadingHistorico ? (
                  <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                ) : historico.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ligação registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {historico.map((h, i) => (
                      <div key={i} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingHistIdx === i ? (
                            // Modo edição inline
                            <div className="flex items-center gap-2 flex-1">
                              <Select
                                value={editingHistStatus}
                                onValueChange={setEditingHistStatus}
                              >
                                <SelectTrigger className="h-7 text-xs w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(statusEditaveis).map(([k, v]) => (
                                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                disabled={savingHist}
                                onClick={() => salvarEdicaoHistorico(h, editingHistStatus)}
                              >
                                {savingHist ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => setEditingHistIdx(null)}
                              >
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            // Modo visualização
                            <>
                              <Badge className={`${statusBadgeClass[h.status || ""] || "status-badge-pendente"} border-0 text-xs`}>
                                {statusLabels[h.status || ""] || h.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {h.data_ligacao ? new Date(h.data_ligacao).toLocaleString("pt-BR") : "—"}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 ml-auto"
                                title="Editar status"
                                onClick={() => {
                                  setEditingHistIdx(i);
                                  // Se o status atual não estiver em statusEditaveis, seleciona o primeiro válido (ou vazio se preferir obrigar a escolher)
                                  const s = h.status || "";
                                  setEditingHistStatus(statusEditaveis[s] ? s : "atendeu");
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {h.lista_nome && <span>Lista: {h.lista_nome}</span>}
                          {h.nome_operador && <span> · Op: {h.nome_operador}</span>}
                        </div>
                        {h.observacao && <p className="text-xs text-muted-foreground">{h.observacao}</p>}
                        {h.horario_retorno && (
                          <p className="text-xs text-status-retornar">Retorno: {h.horario_retorno}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
