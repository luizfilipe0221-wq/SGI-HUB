/**
 * OperatorView
 * Componente visual puro para o operador de ligações.
 * Toda a lógica de dados está em useOperatorSession — este componente
 * apenas consome o hook e renderiza a interface.
 */
import { useParams } from "react-router-dom";
import { useOperatorSession } from "@/hooks/useOperatorSession";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Phone, ChevronLeft, ChevronRight, MapPin, Globe, FileText, Clock,
  CheckCircle2, Loader2, History, PhoneCall, PhoneMissed, Voicemail,
  PhoneOff, PhoneForwarded, RefreshCw,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "atendeu", label: "Atendeu", icon: PhoneCall, colorClass: "text-green-500" },
  { value: "nao-atendeu", label: "Nao Atendeu", icon: PhoneMissed, colorClass: "text-yellow-500" },
  { value: "caixa-postal", label: "Caixa Postal", icon: Voicemail, colorClass: "text-violet-500" },
  { value: "invalido", label: "N. Invalido", icon: PhoneOff, colorClass: "text-red-500" },
  { value: "nao-quer", label: "Nao Quer", icon: Phone, colorClass: "text-orange-500" },
  { value: "retornar", label: "Retornar", icon: PhoneForwarded, colorClass: "text-primary" },
  { value: "revisita", label: "Revisita", icon: RefreshCw, colorClass: "text-foreground" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  atendeu: "Atendeu", "nao-atendeu": "Nao Atendeu", "caixa-postal": "Caixa Postal",
  invalido: "Numero Invalido", "nao-quer": "Nao Quer Contato",
  retornar: "Retornar Depois", revisita: "Revisita",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OperatorView() {
  const { token } = useParams<{ token: string }>();
  const session = useOperatorSession(token);

  const {
    contatos, currentIdx, historico, nomeOperador, completed, completedStatuses,
    status, observacao, horarioRetorno, loading, saving, error, allDone, historyOpen,
    setCurrentIdx, setStatus, setObservacao, setHorarioRetorno,
    setHistoryOpen, setAllDone, salvar, parsePhones,
  } = session;

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md glass-card-elevated text-center">
          <CardContent className="py-12">
            <Logo className="mb-4 justify-center" />
            <p className="text-[15px] text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── All done ──
  if (allDone) {
    const summary: Record<string, number> = {};
    completedStatuses.forEach((s) => { summary[s] = (summary[s] || 0) + 1; });

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md glass-card-elevated text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-status-atendeu mx-auto" />
            <h1 className="text-[24px] font-semibold tracking-[-0.5px]">Parabens, {nomeOperador}!</h1>
            <p className="text-muted-foreground text-[15px]">
              Voce completou todos os <span className="text-foreground font-medium">{contatos.length}</span> contatos!
            </p>
            <div className="space-y-1">
              {Object.entries(summary).map(([s, count]) => (
                <div key={s} className="flex items-center justify-center gap-2">
                  <Badge className={`status-badge-${s} border-0 text-xs`}>{STATUS_LABELS[s] || s}</Badge>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={() => { setAllDone(false); setCurrentIdx(0); }}>
              Revisar ligacoes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main view ──
  const contato = contatos[currentIdx];
  const phones = parsePhones(contato.telefone);
  const doneCount = completed.size;
  const totalCount = contatos.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-[13px] text-muted-foreground">{nomeOperador}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground font-medium">{doneCount} de {totalCount}</span>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Contact Card */}
        <Card className="glass-card-elevated">
          <CardHeader className="pb-3">
            {contato.tipo && (
              <Badge variant="secondary" className="w-fit text-[11px] mb-1">{contato.tipo}</Badge>
            )}
            <CardTitle className="text-[22px] font-semibold tracking-[-0.5px] line-clamp-2">
              {contato.nome || "Sem nome"}
            </CardTitle>
            {completed.has(contato.lista_contato_id) && (
              <Badge className="status-badge-atendeu border-0 w-fit text-xs">Ja registrado</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Phone buttons */}
            <div className="space-y-2">
              {phones.map((phone, i) => (
                <a
                  key={i}
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-3 p-3.5 rounded-[14px] bg-card/70 border border-border/60 hover:bg-card hover:border-border hover:-translate-y-px hover:shadow-md transition-all duration-150"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-medium text-[15px]">{phone}</span>
                  <span className="ml-auto text-xs text-primary font-medium">Ligar</span>
                </a>
              ))}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {contato.endereco && (
                <div className="flex items-start gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground text-[13px]">{contato.endereco}</span>
                </div>
              )}
              {contato.territorio && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-[13px]">Territorio {contato.territorio}</span>
                </div>
              )}
            </div>
            {contato.obs_original && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground italic text-[13px]">{contato.obs_original}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History collapsible */}
        {historico.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Ver historico ({historico.length} tentativas)
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-90" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="glass-card mt-2">
                <CardContent className="space-y-2 pt-4">
                  {historico.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/40 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`status-badge-${h.status} border-0 text-xs`}>
                          {STATUS_LABELS[h.status] || h.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {h.criado_em ? new Date(h.criado_em).toLocaleString("pt-BR") : "—"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {h.lista_nome && <span>Lista: {h.lista_nome}</span>}
                        {h.nome_operador && <span> - Op: {h.nome_operador}</span>}
                      </div>
                      {h.observacao && <p className="text-xs text-muted-foreground">{h.observacao}</p>}
                      {h.horario_retorno && <p className="text-xs text-primary">Retorno: {h.horario_retorno}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Status buttons */}
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = status === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`min-h-[52px] flex items-center gap-3 rounded-[14px] px-4 py-3 text-[15px] font-medium transition-all duration-150 text-left border ${isSelected
                    ? "bg-card border-border/60 -translate-y-px shadow-md"
                    : "bg-card/70 border-border/40 text-foreground hover:bg-card hover:border-border"
                  }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${opt.colorClass}`} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {status === "retornar" && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-[13px]">
              <Clock className="h-4 w-4" /> Melhor horario para retorno
            </Label>
            <Input
              value={horarioRetorno}
              onChange={(e) => setHorarioRetorno(e.target.value)}
              placeholder="Ex: Segunda as 14h"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-[13px]">Observacoes (opcional)</Label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Alguma observacao sobre a ligacao..."
            rows={2}
            className="rounded-xl bg-muted/30 border-input focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>

        <div className="h-2" />
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 glass-header border-t border-border/40 px-4 py-3 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <Button className="flex-1 min-h-[48px]" disabled={saving} onClick={salvar}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Salvar e Proximo
          </Button>
        </div>
      </div>
    </div>
  );
}
