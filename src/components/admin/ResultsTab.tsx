import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, ChevronLeft, ChevronRight } from "lucide-react";

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
  contato_nome: string;
  telefone: string;
  territorio: string;
  nome_operador: string;
  ultimo_status: string;
  ultima_obs: string;
  ultimo_horario_retorno: string;
  ultima_ligacao_em: string;
  total_tentativas: number;
}

export function ResultsTab() {
  const [results, setResults] = useState<Resultado[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOperador, setFilterOperador] = useState("");
  const [filterTerritorio, setFilterTerritorio] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => { loadResults(); }, []);

  async function loadResults() {
    setLoading(true);
    const { data } = await supabase.from("painel_resultados").select("*");
    setResults(data || []);
    setLoading(false);
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
                    <Badge className={`${statusBadgeClass[r.ultimo_status] || "status-badge-pendente"} border-0`}>
                      {statusLabels[r.ultimo_status] || r.ultimo_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-muted-foreground">{r.ultima_obs}</TableCell>
                  <TableCell className="text-muted-foreground">{r.ultimo_horario_retorno || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.ultima_ligacao_em ? new Date(r.ultima_ligacao_em).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-center">{r.total_tentativas}</TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhum resultado encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </div>
  );
}
