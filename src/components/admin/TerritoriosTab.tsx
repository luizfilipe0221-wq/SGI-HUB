import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, RefreshCw } from "lucide-react";

interface TerritoryData {
  territorio: string | null;
  total_contatos: number;
  ja_trabalhados: number;
  atenderam: number;
  nao_atenderam: number;
  invalidos: number;
  nao_querem: number;
  retornar: number;
  pendentes: number;
}

interface ContatoDetail {
  id: number;
  nome: string | null;
  telefone: string;
  endereco: string | null;
  tipo: string | null;
}

export function TerritoriosTab() {
  const [data, setData] = useState<TerritoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyPendentes, setOnlyPendentes] = useState(false);
  const [sortByProgress, setSortByProgress] = useState(true);
  const [selectedTerritorio, setSelectedTerritorio] = useState<string | null>(null);
  const [detailContatos, setDetailContatos] = useState<ContatoDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("relatorio_territorio" as any)
      .select("*");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData((rows || []).map((r: any) => ({
      territorio: r.territorio,
      total_contatos: Number(r.total_contatos) || 0,
      ja_trabalhados: Number(r.ja_trabalhados) || 0,
      atenderam: Number(r.atenderam) || 0,
      nao_atenderam: Number(r.nao_atenderam) || 0,
      invalidos: Number(r.invalidos) || 0,
      nao_querem: Number(r.nao_querem) || 0,
      retornar: Number(r.retornar) || 0,
      pendentes: Number(r.pendentes) || 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function openDetail(territorio: string) {
    setSelectedTerritorio(territorio);
    setDetailLoading(true);
    const { data: contatos } = await supabase
      .from("contatos")
      .select("id, nome, telefone, endereco, tipo")
      .eq("territorio", territorio)
      .order("nome");
    setDetailContatos(contatos || []);
    setDetailLoading(false);
  }

  let displayed = [...data];
  if (onlyPendentes) displayed = displayed.filter((t) => t.pendentes > 0);
  if (sortByProgress) {
    displayed.sort((a, b) => {
      const pctA = a.total_contatos > 0 ? a.ja_trabalhados / a.total_contatos : 0;
      const pctB = b.total_contatos > 0 ? b.ja_trabalhados / b.total_contatos : 0;
      return pctA - pctB;
    });
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-syne font-bold">Relatório por Território</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="pendentes" checked={onlyPendentes} onCheckedChange={(c) => setOnlyPendentes(!!c)} />
            <Label htmlFor="pendentes" className="text-sm cursor-pointer">Apenas com pendentes</Label>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayed.map((t) => {
          const pct = t.total_contatos > 0 ? Math.round((t.ja_trabalhados / t.total_contatos) * 100) : 0;
          return (
            <Card
              key={t.territorio ?? "null"}
              className="border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => openDetail(t.territorio || "")}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <CardTitle className="text-2xl font-syne">{t.territorio ?? "—"}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">{t.total_contatos} contatos</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.atenderam > 0 && <Badge className="bg-status-atendeu border-0 text-xs text-primary-foreground">{t.atenderam}</Badge>}
                  {t.nao_atenderam > 0 && <Badge className="bg-status-nao-atendeu border-0 text-xs text-primary-foreground">{t.nao_atenderam}</Badge>}
                  {t.invalidos > 0 && <Badge className="bg-status-invalido border-0 text-xs text-primary-foreground">{t.invalidos}</Badge>}
                  {t.nao_querem > 0 && <Badge className="bg-status-nao-quer border-0 text-xs text-primary-foreground">{t.nao_querem}</Badge>}
                  {t.retornar > 0 && <Badge className="bg-status-retornar border-0 text-xs text-primary-foreground">{t.retornar}</Badge>}
                  {t.pendentes > 0 && <Badge className="bg-status-pendente border-0 text-xs">{t.pendentes} pend.</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {displayed.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum território encontrado.</p>
          </CardContent>
        </Card>
      )}

      <Sheet open={selectedTerritorio !== null} onOpenChange={(o) => !o && setSelectedTerritorio(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-syne">Território {selectedTerritorio}</SheetTitle>
          </SheetHeader>
          {detailLoading ? (
            <div className="space-y-2 mt-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailContatos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{c.telefone}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{c.endereco || "—"}</TableCell>
                    <TableCell className="text-xs">{c.tipo || "—"}</TableCell>
                  </TableRow>
                ))}
                {detailContatos.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum contato.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
