import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, List, Phone, Clock, PhoneCall, PhoneMissed, PhoneOff } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

interface Stats {
  totalContatos: number;
  totalListas: number;
  totalLigacoes: number;
  totalPendentes: number;
}

interface ListaRow {
  id: number;
  nome: string;
  criado_em: string;
  ativa: boolean;
  total: number;
  concluidos: number;
}

interface StatusCount {
  name: string;
  value: number;
  color: string;
  key: string;
}

interface RecentCall {
  contato_nome: string | null;
  telefone: string | null;
  nome_operador: string | null;
  ultimo_status: string | null;
  ultima_ligacao_em: string | null;
}

interface DailyActivity {
  date: string;
  count: number;
}

interface ListaProgress {
  nome: string;
  atendeu: number;
  "nao-atendeu": number;
  "caixa-postal": number;
  invalido: number;
  "nao-quer": number;
  retornar: number;
  pendente: number;
  total: number;
  pct: number;
}

interface OverviewTabProps {
  onNavigateTab?: (tab: string, filter?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  atendeu: "#34C759",
  "nao-atendeu": "#FFCC00",
  "caixa-postal": "#AF52DE",
  invalido: "#FF3B30",
  "nao-quer": "#FF9500",
  retornar: "#007AFF",
  pendente: "#D1D5DB",
};

const STATUS_LABELS: Record<string, string> = {
  atendeu: "Atendeu",
  "nao-atendeu": "Nao Atendeu",
  "caixa-postal": "Caixa Postal",
  invalido: "Invalido",
  "nao-quer": "Nao Quer",
  retornar: "Retornar",
  pendente: "Pendente",
};

export function OverviewTab({ onNavigateTab }: OverviewTabProps) {
  const [stats, setStats] = useState<Stats>({ totalContatos: 0, totalListas: 0, totalLigacoes: 0, totalPendentes: 0 });
  const [listas, setListas] = useState<ListaRow[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalls, setShowCalls] = useState(false);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [listaProgress, setListaProgress] = useState<ListaProgress[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [contatosRes, listasRes, registrosRes, lcRes] = await Promise.all([
      supabase.from("contatos").select("id", { count: "exact", head: true }),
      supabase.from("listas").select("*").order("criado_em", { ascending: false }),
      supabase.from("registros").select("id", { count: "exact", head: true }),
      supabase.from("lista_contatos").select("id, lista_id"),
    ]);

    const totalContatos = contatosRes.count || 0;
    const totalLigacoes = registrosRes.count || 0;
    const allListas = listasRes.data || [];
    const allLC = lcRes.data || [];

    const { data: regData } = await supabase.from("registros").select("lista_contato_id");
    const registeredLCIds = new Set((regData || []).map((r) => r.lista_contato_id));

    const listRows: ListaRow[] = allListas.map((l) => {
      const lcForList = allLC.filter((lc) => lc.lista_id === l.id);
      const total = lcForList.length;
      const concluidos = lcForList.filter((lc) => registeredLCIds.has(lc.id)).length;
      return { id: l.id, nome: l.nome, criado_em: l.criado_em, ativa: l.ativa ?? true, total, concluidos };
    });

    const totalPendentes = allLC.length - registeredLCIds.size;

    const { data: estData } = await supabase.from("estatisticas_lista").select("*");
    const aggCounts: Record<string, number> = { atendeu: 0, "nao-atendeu": 0, "caixa-postal": 0, invalido: 0, "nao-quer": 0, retornar: 0, pendente: 0 };

    (estData || []).forEach((e: any) => {
      aggCounts.atendeu += Number(e.atendeu) || 0;
      aggCounts["nao-atendeu"] += Number(e.nao_atendeu) || 0;
      aggCounts["caixa-postal"] += Number(e.caixa_postal) || 0;
      aggCounts.invalido += Number(e.invalido) || 0;
      aggCounts["nao-quer"] += Number(e.nao_quer) || 0;
      aggCounts.retornar += Number(e.retornar) || 0;
      aggCounts.pendente += Number(e.pendentes) || 0;
    });

    const chartData: StatusCount[] = Object.entries(aggCounts).map(([key, value]) => ({
      key,
      name: STATUS_LABELS[key] || key,
      value,
      color: STATUS_COLORS[key] || "#999",
    }));

    const { data: regAll } = await supabase.from("registros").select("criado_em").order("criado_em", { ascending: false }).limit(1000);
    const dayCounts: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayCounts[d.toISOString().slice(0, 10)] = 0;
    }
    (regAll || []).forEach((r) => {
      if (r.criado_em) {
        const day = r.criado_em.slice(0, 10);
        if (dayCounts[day] !== undefined) dayCounts[day]++;
      }
    });
    const dailyArr = Object.entries(dayCounts).map(([date, count]) => ({ date, count }));

    const activeListas = allListas.filter((l) => l.ativa);
    const lpData: ListaProgress[] = [];
    for (const lista of activeListas) {
      const est = (estData || []).find((e: any) => e.lista_id === lista.id);
      if (est) {
        const total = Number(est.total_contatos) || 0;
        const done = total - (Number(est.pendentes) || 0);
        lpData.push({
          nome: String(est.lista_nome || lista.nome),
          atendeu: Number(est.atendeu) || 0,
          "nao-atendeu": Number(est.nao_atendeu) || 0,
          "caixa-postal": Number(est.caixa_postal) || 0,
          invalido: Number(est.invalido) || 0,
          "nao-quer": Number(est.nao_quer) || 0,
          retornar: Number(est.retornar) || 0,
          pendente: Number(est.pendentes) || 0,
          total,
          pct: total > 0 ? Math.round((done / total) * 100) : 0,
        });
      }
    }

    setStats({ totalContatos, totalListas: allListas.length, totalLigacoes, totalPendentes: Math.max(0, totalPendentes) });
    setListas(listRows);
    setStatusCounts(chartData);
    setDailyActivity(dailyArr);
    setListaProgress(lpData);
    setLoading(false);
  }

  async function openRecentCalls() {
    const { data } = await supabase
      .from("painel_resultados")
      .select("contato_nome, telefone, nome_operador, ultimo_status, ultima_ligacao_em")
      .not("ultimo_status", "is", null)
      .order("ultima_ligacao_em", { ascending: false })
      .limit(20);
    setRecentCalls(data || []);
    setShowCalls(true);
  }

  const statCards = [
    { label: "Total Contatos", value: stats.totalContatos, icon: Users, borderColor: "border-l-primary", action: () => onNavigateTab?.("contatos") },
    { label: "Listas Criadas", value: stats.totalListas, icon: List, borderColor: "border-l-status-retornar", action: () => onNavigateTab?.("manage") },
    { label: "Ligacoes Realizadas", value: stats.totalLigacoes, icon: Phone, borderColor: "border-l-status-atendeu", action: openRecentCalls },
    { label: "Pendentes", value: stats.totalPendentes, icon: Clock, borderColor: "border-l-status-nao-atendeu", action: () => onNavigateTab?.("contatos", "pendente") },
  ];

  const totalWorked = statusCounts.filter((s) => s.key !== "pendente").reduce((acc, s) => acc + s.value, 0);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    backdropFilter: "blur(20px)",
  };

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={`glass-card-elevated cursor-pointer transition-all duration-150 hover:-translate-y-0.5 border-l-[3px] ${s.borderColor}`}
            onClick={s.action}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-[0.3px]">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tracking-[-1px] text-foreground">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        {statusCounts.some((s) => s.value > 0) && (
          <Card className="glass-card rounded-[18px]">
            <CardHeader>
              <CardTitle className="text-[13px] uppercase text-muted-foreground font-semibold tracking-[0.3px]">Distribuicao de Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusCounts.filter((s) => s.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusCounts.filter((s) => s.value > 0).map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    formatter={(value, entry: any) => {
                      const item = statusCounts.find((s) => s.name === value);
                      const pct = totalWorked > 0 && item ? Math.round((item.value / totalWorked) * 100) : 0;
                      return <span className="text-[11px] text-foreground">{value}: {item?.value || 0} ({pct}%)</span>;
                    }}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#000000" fontSize={20} fontWeight="bold">
                    {totalWorked}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Daily Activity */}
        <Card className="glass-card rounded-[18px]">
          <CardHeader>
            <CardTitle className="text-[13px] uppercase text-muted-foreground font-semibold tracking-[0.3px]">Atividade por Dia (14 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyActivity}>
                <XAxis dataKey="date" tick={{ fill: "#303136", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#303136", fontSize: 10 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [value, "Ligacoes"]}
                  labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("pt-BR")}
                />
                <Bar dataKey="count" fill="#007AFF" opacity={0.8} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista Progress */}
      {listaProgress.length > 0 && (
        <Card className="glass-card rounded-[18px]">
          <CardHeader>
            <CardTitle className="text-[13px] uppercase text-muted-foreground font-semibold tracking-[0.3px]">Progresso por Lista</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(150, listaProgress.length * 50)}>
              <BarChart data={listaProgress} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fill: "#303136", fontSize: 10 }} />
                <YAxis type="category" dataKey="nome" tick={{ fill: "#303136", fontSize: 11 }} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="atendeu" stackId="a" fill={STATUS_COLORS.atendeu} name="Atendeu" />
                <Bar dataKey="nao-atendeu" stackId="a" fill={STATUS_COLORS["nao-atendeu"]} name="Nao Atendeu" />
                <Bar dataKey="caixa-postal" stackId="a" fill={STATUS_COLORS["caixa-postal"]} name="Caixa Postal" />
                <Bar dataKey="invalido" stackId="a" fill={STATUS_COLORS.invalido} name="Invalido" />
                <Bar dataKey="nao-quer" stackId="a" fill={STATUS_COLORS["nao-quer"]} name="Nao Quer" />
                <Bar dataKey="retornar" stackId="a" fill={STATUS_COLORS.retornar} name="Retornar" />
                <Bar dataKey="pendente" stackId="a" fill={STATUS_COLORS.pendente} name="Pendente" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Listas Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-[13px] uppercase text-muted-foreground font-semibold tracking-[0.3px]">Listas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Contatos</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listas.map((l) => {
                const pct = l.total > 0 ? Math.round((l.concluidos / l.total) * 100) : 0;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(l.criado_em).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{l.total}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 w-20" />
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.ativa ? "default" : "secondary"} className="text-xs">{l.ativa ? "Ativa" : "Inativa"}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {listas.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma lista criada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Calls Modal */}
      <Dialog open={showCalls} onOpenChange={setShowCalls}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ultimas 20 Ligacoes</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCalls.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{c.contato_nome || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.nome_operador || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`status-badge-${c.ultimo_status || "pendente"} border-0 text-xs`}>
                      {STATUS_LABELS[c.ultimo_status || ""] || c.ultimo_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.ultima_ligacao_em ? new Date(c.ultima_ligacao_em).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
