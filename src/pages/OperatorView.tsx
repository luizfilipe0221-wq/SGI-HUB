/**
 * OperatorView — Lista accordion
 * Todos os contatos são exibidos em lista vertical.
 * Cada item tem uma setinha que expande para registrar status/observação.
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useOperatorSession } from "@/hooks/useOperatorSession";
import { ContatoData } from "@/hooks/useOperatorSession";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone, MapPin, Globe, FileText, Clock,
  CheckCircle2, Loader2,
  PhoneCall, PhoneMissed, Voicemail, PhoneOff, PhoneForwarded, RefreshCw,
  ChevronDown,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "atendeu",      label: "Atendeu",      icon: PhoneCall,     colorClass: "text-green-500" },
  { value: "nao-atendeu",  label: "Não Atendeu",  icon: PhoneMissed,   colorClass: "text-yellow-500" },
  { value: "caixa-postal", label: "Caixa Postal", icon: Voicemail,     colorClass: "text-violet-500" },
  { value: "invalido",     label: "N. Inválido",  icon: PhoneOff,      colorClass: "text-red-500" },
  { value: "nao-quer",     label: "Não Quer",     icon: Phone,         colorClass: "text-orange-500" },
  { value: "retornar",     label: "Retornar",     icon: PhoneForwarded,colorClass: "text-primary" },
  { value: "revisita",     label: "Revisita",     icon: RefreshCw,     colorClass: "text-foreground" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  atendeu: "Atendeu", "nao-atendeu": "Não Atendeu", "caixa-postal": "Caixa Postal",
  invalido: "Nº Inválido", "nao-quer": "Não Quer Contato",
  retornar: "Retornar Depois", revisita: "Revisita",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  atendeu: "status-badge-atendeu", "nao-atendeu": "status-badge-nao-atendeu",
  "caixa-postal": "status-badge-caixa-postal", invalido: "status-badge-invalido",
  "nao-quer": "status-badge-nao-quer", retornar: "status-badge-retornar",
  revisita: "status-badge-revisita",
};

// ─── Contact Row ─────────────────────────────────────────────────────────────

interface ContactRowProps {
  contato: ContatoData;
  index: number;
  isDone: boolean;
  doneStatus: string | undefined;
  saving: boolean;
  parsePhones: (t: string) => string[];
  onSave: (lcId: number, status: string, obs: string, horario: string) => Promise<boolean>;
}

function ContactRow({ contato, index, isDone, doneStatus, saving, parsePhones, onSave }: ContactRowProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [observacao, setObservacao] = useState("");
  const [horario, setHorario] = useState("");
  const [localSaving, setLocalSaving] = useState(false);

  const phones = parsePhones(contato.telefone);

  async function handleSave() {
    setLocalSaving(true);
    const ok = await onSave(contato.lista_contato_id, status, observacao, horario);
    if (ok) {
      setOpen(false);
      setStatus("");
      setObservacao("");
      setHorario("");
    }
    setLocalSaving(false);
  }

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      isDone ? "border-green-500/30 bg-green-500/5" : "border-border/60 bg-card/70"
    }`}>
      {/* Row header — always visible */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Number badge */}
        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          isDone ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
        }`}>
          {isDone ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : index + 1}
        </span>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[14px] truncate">{contato.nome || "Sem nome"}</p>
          <p className="text-xs text-muted-foreground truncate">{phones[0]}</p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {isDone && doneStatus && (
            <Badge className={`${STATUS_BADGE_CLASS[doneStatus] || ""} border-0 text-[10px] hidden sm:flex`}>
              {STATUS_LABELS[doneStatus] || doneStatus}
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Expandable content */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
          {/* Phone buttons */}
          <div className="space-y-2">
            {phones.map((phone, i) => (
              <a
                key={i}
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-card border border-border/60 hover:border-border hover:-translate-y-px transition-all duration-150"
              >
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-[14px]">{phone}</span>
                <span className="ml-auto text-xs text-primary font-medium">Ligar</span>
              </a>
            ))}
          </div>

          {/* Contact info */}
          <div className="space-y-1 text-[12px] text-muted-foreground">
            {contato.endereco && (
              <div className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{contato.endereco}</span>
              </div>
            )}
            {contato.territorio && (
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span>Território {contato.territorio}</span>
              </div>
            )}
            {contato.obs_original && (
              <div className="flex items-start gap-1.5">
                <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="italic">{contato.obs_original}</span>
              </div>
            )}
          </div>

          {/* Status grid */}
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatus(isSelected ? "" : opt.value)}
                  className={`flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-medium border transition-all duration-150 text-left ${
                    isSelected
                      ? "bg-card border-border shadow-sm -translate-y-px"
                      : "bg-muted/30 border-border/40 hover:bg-card hover:border-border"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${opt.colorClass}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Horário retorno */}
          {status === "retornar" && (
            <div className="space-y-1.5">
              <Label className="text-[12px] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Horário para retorno
              </Label>
              <Input
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Ex: Segunda às 14h"
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Observação */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Alguma observação sobre a ligação..."
              rows={2}
              className="text-sm rounded-xl bg-muted/30 border-input"
            />
          </div>

          {/* Save button */}
          <Button
            className="w-full"
            disabled={!status || localSaving || saving}
            onClick={handleSave}
          >
            {localSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OperatorView() {
  const { token } = useParams<{ token: string }>();
  const session = useOperatorSession(token);

  const {
    contatos, nomeOperador, completed, completedStatuses,
    loading, saving, error, allDone,
    setAllDone, salvarContato, parsePhones,
  } = session;

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
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
  const doneCount = completed.size;
  const totalCount = contatos.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (allDone) {
    const summary: Record<string, number> = {};
    completedStatuses.forEach((s) => { summary[s] = (summary[s] || 0) + 1; });

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md glass-card-elevated text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-[24px] font-semibold tracking-[-0.5px]">Parabéns, {nomeOperador}!</h1>
            <p className="text-muted-foreground text-[15px]">
              Você completou todos os <span className="text-foreground font-medium">{totalCount}</span> contatos!
            </p>
            <div className="space-y-1">
              {Object.entries(summary).map(([s, count]) => (
                <div key={s} className="flex items-center justify-center gap-2">
                  <Badge className={`${STATUS_BADGE_CLASS[s] || ""} border-0 text-xs`}>{STATUS_LABELS[s] || s}</Badge>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={() => setAllDone(false)}>
              Revisar ligações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Logo />
          <span className="text-[13px] text-muted-foreground">{nomeOperador}</span>
        </div>
        <div className="mt-2 max-w-4xl mx-auto flex items-center gap-2">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground font-medium">{doneCount} de {totalCount}</span>
        </div>
      </header>

      {/* Contact list */}
      <div className="px-4 py-4 max-w-4xl mx-auto space-y-3">
        {contatos.map((contato, i) => (
          <ContactRow
            key={contato.lista_contato_id}
            contato={contato}
            index={i}
            isDone={completed.has(contato.lista_contato_id)}
            doneStatus={completedStatuses.get(contato.lista_contato_id)}
            saving={saving}
            parsePhones={parsePhones}
            onSave={salvarContato}
          />
        ))}
      </div>
    </div>
  );
}
