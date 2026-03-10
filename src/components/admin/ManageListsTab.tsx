import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { ChevronDown, Copy, ToggleLeft, ToggleRight, MoreVertical, Edit, CopyPlus, Trash2, RefreshCw, List } from "lucide-react";

interface Lista {
  id: number;
  nome: string;
  descricao: string | null;
  ativa: boolean;
  criado_em: string;
}

interface Operador {
  nome_operador: string;
  token_operador: string;
  link_ativo: boolean;
  total: number;
  registrados: number;
  primeiro_telefone: string;
}

interface ListaStats {
  total: number;
  atendeu: number;
  naoAtendeu: number;
  pendentes: number;
  retornar: number;
}

export function ManageListsTab() {
  const [listas, setListas] = useState<Lista[]>([]);
  const [operadoresByLista, setOperadoresByLista] = useState<Record<number, Operador[]>>({});
  const [statsByLista, setStatsByLista] = useState<Record<number, ListaStats>>({});
  const [loading, setLoading] = useState(true);

  const [editLista, setEditLista] = useState<Lista | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [deleteLista, setDeleteLista] = useState<Lista | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: listasData } = await supabase.from("listas").select("*").order("criado_em", { ascending: false });
    setListas(listasData || []);

    if (listasData && listasData.length > 0) {
      const { data: lcData } = await supabase
        .from("lista_contatos")
        .select("id, lista_id, nome_operador, token_operador, link_ativo, contato_id");

      // Buscar telefones dos contatos
      const contatoIds = [...new Set((lcData || []).map((lc) => lc.contato_id))];
      const { data: contatosData } = contatoIds.length > 0
        ? await supabase.from("contatos").select("id, telefone").in("id", contatoIds)
        : { data: [] };
      const telefoneMap = new Map((contatosData || []).map((c) => [c.id, c.telefone]));

      const { data: regData } = await supabase.from("registros").select("lista_contato_id");
      const regSet = new Set((regData || []).map((r) => r.lista_contato_id));

      const grouped: Record<number, Map<string, Operador>> = {};
      const stats: Record<number, ListaStats> = {};

      listasData.forEach((l) => {
        grouped[l.id] = new Map();
        stats[l.id] = { total: 0, atendeu: 0, naoAtendeu: 0, pendentes: 0, retornar: 0 };
      });

      (lcData || []).forEach((lc) => {
        const map = grouped[lc.lista_id];
        if (!map) return;

        const hasReg = regSet.has(lc.id);
        const s = stats[lc.lista_id];
        if (s) {
          s.total++;
          if (!hasReg) s.pendentes++;
        }

        const telefone = telefoneMap.get(lc.contato_id) || "";
        const primeiraTel = telefone.split(/[|/,]/)[0]?.trim() || "";

        const existing = map.get(lc.token_operador);
        if (existing) {
          existing.total++;
          if (hasReg) existing.registrados++;
        } else {
          map.set(lc.token_operador, {
            nome_operador: lc.nome_operador || "",
            token_operador: lc.token_operador,
            link_ativo: lc.link_ativo ?? true,
            total: 1,
            registrados: hasReg ? 1 : 0,
            primeiro_telefone: primeiraTel,
          });
        }
      });

      const { data: painelData } = await supabase.from("painel_resultados").select("lista_id, ultimo_status");
      (painelData || []).forEach((p) => {
        const s = stats[p.lista_id!];
        if (!s) return;
        if (p.ultimo_status === "atendeu") s.atendeu++;
        else if (p.ultimo_status === "nao-atendeu") s.naoAtendeu++;
        else if (p.ultimo_status === "retornar") s.retornar++;
      });

      const opsRecord: Record<number, Operador[]> = {};
      Object.entries(grouped).forEach(([k, map]) => {
        opsRecord[Number(k)] = Array.from(map.values());
      });

      setOperadoresByLista(opsRecord);
      setStatsByLista(stats);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function toggleLista(id: number, ativa: boolean) {
    await supabase.from("listas").update({ ativa: !ativa }).eq("id", id);
    toast({ title: ativa ? "Lista desativada" : "Lista reativada" });
    loadData();
  }

  async function toggleLink(token: string, ativo: boolean) {
    await supabase.from("lista_contatos").update({ link_ativo: !ativo }).eq("token_operador", token);
    toast({ title: ativo ? "Link desativado. O operador não conseguirá mais acessar." : "Link reativado" });
    loadData();
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/lista/${token}`);
    toast({ title: "Link copiado!" });
  }

  async function saveEdit() {
    if (!editLista) return;
    await supabase.from("listas").update({ nome: editNome.trim(), descricao: editDescricao.trim() || null }).eq("id", editLista.id);
    toast({ title: "Lista atualizada!" });
    setEditLista(null);
    loadData();
  }

  async function duplicarLista(lista: Lista) {
    const { data: lcData } = await supabase.from("lista_contatos").select("contato_id, nome_operador").eq("lista_id", lista.id);
    if (!lcData || lcData.length === 0) {
      toast({ title: "Lista vazia, não duplicada.", variant: "destructive" });
      return;
    }
    const payload = lcData.map((lc, i) => ({
      contato_id: lc.contato_id,
      nome_operador: lc.nome_operador || "Operador",
      ordem: i + 1,
    }));
    
    toast({ title: "Duplicando..." });
    const { error } = await supabase.rpc("criar_lista_completa", {
      p_nome: `Cópia de ${lista.nome}`,
      p_descricao: lista.descricao || "",
      p_contatos: payload,
      p_ativa: true,
    });

    if (error) {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lista duplicada!" });
      loadData();
    }
  }

  async function confirmarDelete() {
    if (!deleteLista) return;
    const id = deleteLista.id;
    // Atualizar estado local IMEDIATAMENTE para UI responsiva
    setListas((prev) => prev.filter((l) => l.id !== id));
    setDeleteLista(null);
    toast({ title: "Excluindo..." });

    // Depois faz a deleção no banco em background via RPC (contorna RLS)
    const { error } = await supabase.rpc("admin_excluir_lista", { p_lista_id: id });
    if (error) {
       toast({ title: "Erro na exclusão", description: error.message, variant: "destructive" });
       // Em caso de erro, seria ideal "desfazer" a UI otimista recarregando a lista
       loadData();
    } else {
       toast({ title: "Lista excluída!" });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
      </div>
    );
  }

  if (listas.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 text-center">
          <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Nenhuma lista criada.</p>
          <p className="text-sm text-muted-foreground">Crie sua primeira lista para começar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
        </Button>
      </div>

      {listas.map((l) => {
        const s = statsByLista[l.id] || { total: 0, atendeu: 0, naoAtendeu: 0, pendentes: 0, retornar: 0 };
        const pct = s.total > 0 ? Math.round(((s.total - s.pendentes) / s.total) * 100) : 0;

        return (
          <Collapsible key={l.id}>
            <Card className="border-border/50">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{l.nome}</CardTitle>
                        <Badge variant={l.ativa ? "default" : "secondary"}>{l.ativa ? "Ativa" : "Inativa"}</Badge>
                      </div>
                      {l.descricao && <p className="text-xs text-muted-foreground">{l.descricao}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(l.criado_em).toLocaleDateString("pt-BR")}</p>
                      <div className="flex items-center gap-2 max-w-xs">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">Total: {s.total}</Badge>
                        <Badge className="bg-status-atendeu border-0 text-xs text-primary-foreground">Atendeu: {s.atendeu}</Badge>
                        <Badge className="bg-status-nao-atendeu border-0 text-xs text-primary-foreground">N/Atendeu: {s.naoAtendeu}</Badge>
                        <Badge className="bg-status-pendente border-0 text-xs text-primary-foreground">Pend: {s.pendentes}</Badge>
                        <Badge className="bg-status-retornar border-0 text-xs text-primary-foreground">Retornar: {s.retornar}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditLista(l); setEditNome(l.nome); setEditDescricao(l.descricao || ""); }}>
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicarLista(l); }}>
                            <CopyPlus className="h-4 w-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleLista(l.id, l.ativa); }}>
                            {l.ativa ? <ToggleLeft className="h-4 w-4 mr-2" /> : <ToggleRight className="h-4 w-4 mr-2" />}
                            {l.ativa ? "Desativar" : "Reativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteLista(l); }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 pt-0">
                  {(operadoresByLista[l.id] || []).map((op) => {
                    const opPct = op.total > 0 ? Math.round((op.registrados / op.total) * 100) : 0;
                    return (
                      <div key={op.token_operador} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 flex-wrap">
                        <div className="flex-1 min-w-[120px]">
                          <p className="font-medium text-sm">{op.nome_operador || "Sem nome"}</p>
                          {op.primeiro_telefone && (
                            <p className="text-xs text-muted-foreground">{op.primeiro_telefone}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={opPct} className="h-2 w-16" />
                          <span className="text-xs text-muted-foreground">{op.registrados}/{op.total}</span>
                        </div>
                        <Badge variant={op.link_ativo ? "default" : "secondary"} className="text-xs">
                          {op.link_ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => copyLink(op.token_operador)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleLink(op.token_operador, op.link_ativo)}>
                          {op.link_ativo ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                      </div>
                    );
                  })}
                  {!(operadoresByLista[l.id] || []).length && (
                    <p className="text-sm text-muted-foreground">Nenhum operador nesta lista.</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Edit Modal */}
      <Dialog open={!!editLista} onOpenChange={(o) => !o && setEditLista(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Lista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nome</Label><Input value={editNome} onChange={(e) => setEditNome(e.target.value)} /></div>
            <div className="space-y-1"><Label>Descrição</Label><Input value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={saveEdit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLista} onOpenChange={(o) => !o && setDeleteLista(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista "{deleteLista?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Esta ação não pode ser desfeita. {statsByLista[deleteLista?.id || 0]?.total || 0} contatos serão removidos desta lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
