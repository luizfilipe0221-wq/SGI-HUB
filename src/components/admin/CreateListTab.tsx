import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy, Loader2, Search, CheckSquare, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface Contato {
  id: number;
  nome: string | null;
  telefone: string;
  territorio: string | null;
  tipo: string | null;
}

const PAGE_SIZE = 25;

export function CreateListTab() {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [allContatos, setAllContatos] = useState<Contato[]>([]);
  const [selectedContatos, setSelectedContatos] = useState<Contato[]>([]);
  const [step, setStep] = useState<"select" | "config">("select");

  // Auto mode filters
  const [territorio, setTerritorio] = useState("all");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState<number | string>(50);
  const [semLigacao, setSemLigacao] = useState(true);
  const [autoPreview, setAutoPreview] = useState<Contato[]>([]);
  const [previewing, setPreviewing] = useState(false);

  // Manual mode
  const [manualSearch, setManualSearch] = useState("");
  const [manualTerritorio, setManualTerritorio] = useState("all");
  const [manualTipo, setManualTipo] = useState("all");
  const [manualSelected, setManualSelected] = useState<Set<number>>(new Set());
  const [manualPage, setManualPage] = useState(0);

  // Config step
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [operadores, setOperadores] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);

  // Result modal
  const [links, setLinks] = useState<{ nome: string; link: string }[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { loadContatos(); }, []);

  async function loadContatos() {
    const { data } = await supabase
      .from("contatos")
      .select("id, nome, telefone, territorio, tipo")
      .order("id");
    setAllContatos(data || []);
  }

  const tipos = useMemo(() => {
    const set = new Set<string>();
    allContatos.forEach((c) => { if (c.tipo) set.add(c.tipo); });
    return Array.from(set).sort();
  }, [allContatos]);

  // Auto mode preview
  async function previewContatos() {
    setPreviewing(true);
    let filtered = [...allContatos];

    if (territorio !== "all") {
      filtered = filtered.filter((c) => c.territorio === territorio);
    }
    if (tipo) {
      filtered = filtered.filter((c) => c.tipo?.toLowerCase().includes(tipo.toLowerCase()));
    }

    if (semLigacao && filtered.length > 0) {
      const ids = filtered.map((c) => c.id);
      const { data: contactedLC } = await supabase
        .from("lista_contatos")
        .select("contato_id, id")
        .in("contato_id", ids);

      if (contactedLC && contactedLC.length > 0) {
        const lcIds = contactedLC.map((lc) => lc.id);
        const { data: regData } = await supabase
          .from("registros")
          .select("lista_contato_id")
          .in("lista_contato_id", lcIds);
        const regLCIds = new Set((regData || []).map((r) => r.lista_contato_id));
        const contactedWithReg = contactedLC.filter((lc) => regLCIds.has(lc.id));
        const contactedIds = new Set(contactedWithReg.map((lc) => lc.contato_id));
        filtered = filtered.filter((c) => !contactedIds.has(c.id));
      }
    }

    setAutoPreview(filtered.slice(0, Number(quantidade) || 0));
    setPreviewing(false);
  }

  // Manual mode filtering
  const manualFiltered = useMemo(() => {
    return allContatos.filter((c) => {
      if (manualSearch) {
        const s = manualSearch.toLowerCase();
        if (!(c.nome?.toLowerCase().includes(s) || c.telefone?.toLowerCase().includes(s))) return false;
      }
      if (manualTerritorio !== "all" && c.territorio !== manualTerritorio) return false;
      if (manualTipo !== "all" && c.tipo !== manualTipo) return false;
      return true;
    });
  }, [allContatos, manualSearch, manualTerritorio, manualTipo]);

  const manualTotalPages = Math.ceil(manualFiltered.length / PAGE_SIZE);
  const manualPaged = manualFiltered.slice(manualPage * PAGE_SIZE, (manualPage + 1) * PAGE_SIZE);

  function toggleManual(id: number) {
    const s = new Set(manualSelected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setManualSelected(s);
  }

  function selectAutoContatos() {
    setSelectedContatos(autoPreview);
    setStep("config");
  }

  function selectManualContatos() {
    const selected = allContatos.filter((c) => manualSelected.has(c.id));
    setSelectedContatos(selected);
    setStep("config");
  }

  // Operators
  function addOperador() {
    if (operadores.length >= 10) return;
    setOperadores([...operadores, ""]);
  }
  function removeOperador(idx: number) {
    setOperadores(operadores.filter((_, i) => i !== idx));
  }
  function updateOperador(idx: number, value: string) {
    const copy = [...operadores]; copy[idx] = value; setOperadores(copy);
  }

  const validOps = operadores.filter((o) => o.trim());
  const distribution = useMemo(() => {
    if (validOps.length === 0) return [];
    const per = Math.floor(selectedContatos.length / validOps.length);
    const extra = selectedContatos.length % validOps.length;
    return validOps.map((name, i) => ({
      name,
      count: per + (i < extra ? 1 : 0),
    }));
  }, [validOps, selectedContatos]);

  async function criarLista() {
    if (!nome.trim()) {
      toast({ title: "Erro", description: "Nome da lista é obrigatório.", variant: "destructive" });
      return;
    }
    if (validOps.length === 0) {
      toast({ title: "Erro", description: "Adicione ao menos um operador.", variant: "destructive" });
      return;
    }
    if (selectedContatos.length === 0) {
      toast({ title: "Erro", description: "Selecione contatos primeiro.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Create lista WITHOUT token_gestor (auto-generated by DB)
      const { data: lista, error: listaErr } = await supabase
        .from("listas")
        .insert({ nome: nome.trim(), descricao: descricao.trim() || null, ativa: true })
        .select("id")
        .single();

      if (listaErr || !lista) throw listaErr;

      // Distribute contacts among operators
      let idx = 0;
      const generatedLinks: { nome: string; link: string }[] = [];

      for (let i = 0; i < validOps.length; i++) {
        const count = distribution[i].count;
        const opContatos = selectedContatos.slice(idx, idx + count);
        idx += count;

        // Insert WITHOUT token_operador (auto-generated by DB)
        // We need to insert one by one to get unique tokens, OR insert all and query back
        const rows = opContatos.map((c, j) => ({
          lista_id: lista.id,
          contato_id: c.id,
          nome_operador: validOps[i],
          link_ativo: true,
          ordem: j + 1,
        }));

        if (rows.length > 0) {
          const { error } = await supabase.from("lista_contatos").insert(rows);
          if (error) throw error;
        }
      }

      // Now query back to get the generated tokens for each operator
      const { data: lcData } = await supabase
        .from("lista_contatos")
        .select("nome_operador, token_operador")
        .eq("lista_id", lista.id);

      const opTokens = new Map<string, string>();
      (lcData || []).forEach((lc) => {
        if (lc.nome_operador && !opTokens.has(lc.nome_operador)) {
          opTokens.set(lc.nome_operador, lc.token_operador);
        }
      });

      for (const op of validOps) {
        const token = opTokens.get(op);
        if (token) {
          generatedLinks.push({
            nome: op,
            link: `${window.location.origin}/lista/${token}`,
          });
        }
      }

      setLinks(generatedLinks);
      setShowModal(true);
      toast({ title: "Sucesso!", description: "Lista criada e links gerados." });
    } catch (err: any) {
      console.error("DEBUG SUPERBASE ERROR:", err);
      // Se for um err custom supabase, vai ter message e details
      const msg = err?.message || err?.details || JSON.stringify(err) || "Erro ao criar lista.";
      toast({ title: "Erro Detalhado", description: msg, variant: "destructive", duration: 7000 });
    } finally {
      setLoading(false);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    toast({ title: "Copiado!" });
  }

  function copyAllLinks() {
    const text = links.map((l) => `${l.nome}: ${l.link}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Todos os links copiados!" });
  }

  function resetForm() {
    setShowModal(false);
    setLinks([]);
    setNome("");
    setDescricao("");
    setOperadores([""]);
    setSelectedContatos([]);
    setAutoPreview([]);
    setManualSelected(new Set());
    setStep("select");
  }

  // Config step view
  if (step === "config") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Badge variant="secondary">{selectedContatos.length} contatos selecionados</Badge>
        </div>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Dados da Lista</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da lista *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Território 5 - Comércios" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Operadores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {operadores.map((op, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={op} onChange={(e) => updateOperador(i, e.target.value)} placeholder={`Nome do operador ${i + 1}`} />
                {operadores.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeOperador(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {operadores.length < 10 && (
              <Button size="sm" variant="outline" onClick={addOperador}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Operador
              </Button>
            )}

            {distribution.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium mb-2">Distribuição:</p>
                {distribution.map((d, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {d.name}: <span className="text-foreground font-medium">{d.count} contatos</span>
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={criarLista} disabled={loading} className="w-full md:w-auto" size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Criar Lista e Gerar Links
        </Button>

        {/* Links Modal */}
        <Dialog open={showModal} onOpenChange={(o) => { if (!o) resetForm(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-syne">Links dos Operadores</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {links.map((l, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <span className="font-medium min-w-[80px]">{l.nome}</span>
                  <code className="text-xs text-muted-foreground flex-1 truncate">{l.link}</code>
                  <Button size="sm" variant="outline" onClick={() => copyLink(l.link)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button onClick={copyAllLinks} variant="outline" className="w-full">
                <Copy className="h-4 w-4 mr-2" /> Copiar todos os links
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Select step
  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "auto" | "manual")}>
        <TabsList className="mb-4">
          <TabsTrigger value="auto"><Filter className="h-4 w-4 mr-1" /> Filtros Automáticos</TabsTrigger>
          <TabsTrigger value="manual"><CheckSquare className="h-4 w-4 mr-1" /> Seleção Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="auto">
          <Card className="border-border/50">
            <CardHeader><CardTitle>Filtrar Contatos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Território</Label>
                  <Select value={territorio} onValueChange={setTerritorio}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Array.from({ length: 32 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Buscar por tipo" />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value === "" ? "" : Number(e.target.value))} min={1} max={500} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="semLigacao" checked={semLigacao} onCheckedChange={(c) => setSemLigacao(!!c)} />
                <Label htmlFor="semLigacao" className="cursor-pointer">Apenas contatos sem ligação prévia</Label>
              </div>
              <Button onClick={previewContatos} disabled={previewing} variant="outline">
                {previewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Visualizar Contatos
              </Button>

              {autoPreview.length > 0 && (
                <>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Território</TableHead>
                          <TableHead>Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {autoPreview.slice(0, 20).map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.nome}</TableCell>
                            <TableCell className="text-muted-foreground">{c.telefone}</TableCell>
                            <TableCell>{c.territorio}</TableCell>
                            <TableCell>{c.tipo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {autoPreview.length > 20 && (
                      <p className="text-xs text-muted-foreground p-3">
                        Mostrando 20 de {autoPreview.length} contatos.
                      </p>
                    )}
                  </div>
                  <Button onClick={selectAutoContatos}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Selecionar estes {autoPreview.length} contatos
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Selecionar Contatos</CardTitle>
                <Badge variant="secondary">{manualSelected.size} selecionados</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={manualSearch} onChange={(e) => { setManualSearch(e.target.value); setManualPage(0); }} placeholder="Buscar..." className="pl-9" />
                </div>
                <Select value={manualTerritorio} onValueChange={(v) => { setManualTerritorio(v); setManualPage(0); }}>
                  <SelectTrigger><SelectValue placeholder="Território" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.from({ length: 32 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={manualTipo} onValueChange={(v) => { setManualTipo(v); setManualPage(0); }}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tipos.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Terr.</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualPaged.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => toggleManual(c.id)}>
                        <TableCell>
                          <Checkbox checked={manualSelected.has(c.id)} onCheckedChange={() => toggleManual(c.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{c.nome || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{c.telefone}</TableCell>
                        <TableCell>{c.territorio}</TableCell>
                        <TableCell className="text-xs">{c.tipo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {manualTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={manualPage === 0} onClick={() => setManualPage(manualPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {manualPage + 1} / {manualTotalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={manualPage >= manualTotalPages - 1} onClick={() => setManualPage(manualPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {manualSelected.size > 0 && (
                <Button onClick={selectManualContatos}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Confirmar seleção ({manualSelected.size} contatos)
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
