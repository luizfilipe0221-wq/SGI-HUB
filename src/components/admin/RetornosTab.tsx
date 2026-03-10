import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneForwarded, RefreshCw, Phone, Clock } from "lucide-react";

interface RetornoRow {
  contato_id: number | null;
  contato_nome: string | null;
  telefone: string | null;
  territorio: string | null;
  nome_operador: string | null;
  horario_retorno: string | null;
  dias_em_aberto: number | null;
  total_tentativas: number | null;
  lista_nome: string | null;
}

export function RetornosTab() {
  const [data, setData] = useState<RetornoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOperador, setFilterOperador] = useState("all");
  const [filterTerritorio, setFilterTerritorio] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("fila_retornos")
      .select("*")
      .order("dias_em_aberto", { ascending: false });
    setData(rows || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const operadores = [...new Set(data.map((r) => r.nome_operador?.trim()).filter(Boolean))] as string[];
  const territorios = [...new Set(data.map((r) => r.territorio?.trim()).filter(Boolean))] as string[];

  const filtered = data.filter((r) => {
    if (filterOperador !== "all" && r.nome_operador !== filterOperador) return false;
    if (filterTerritorio !== "all" && r.territorio !== filterTerritorio) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-syne font-bold">Fila de Retornos</h2>
          <p className="text-sm text-muted-foreground">Contatos aguardando novo contato</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" /> {filtered.length} contatos
          </Badge>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select value={filterOperador} onValueChange={setFilterOperador}>
          <SelectTrigger><SelectValue placeholder="Operador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos operadores</SelectItem>
            {operadores.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTerritorio} onValueChange={setFilterTerritorio}>
          <SelectTrigger><SelectValue placeholder="Território" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos territórios</SelectItem>
            {territorios.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <PhoneForwarded className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum retorno pendente</p>
            <p className="text-sm text-muted-foreground">Ótimo trabalho!</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Território</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Lista</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.contato_nome || "—"}</TableCell>
                    <TableCell>
                      {r.telefone ? (
                        <a href={`tel:${r.telefone.replace(/\D/g, "")}`} className="text-primary hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {r.telefone}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{r.territorio || "—"}</TableCell>
                    <TableCell>{r.nome_operador || "—"}</TableCell>
                    <TableCell>
                      {r.horario_retorno ? (
                        <Badge className="bg-status-retornar border-0 text-xs text-primary-foreground">
                          {r.horario_retorno}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className={r.dias_em_aberto && r.dias_em_aberto > 3 ? "text-destructive font-bold" : ""}>
                      {r.dias_em_aberto ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">{r.total_tentativas ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.lista_nome || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
