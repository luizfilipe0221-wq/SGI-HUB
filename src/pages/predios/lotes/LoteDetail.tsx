import { useParams, useNavigate } from 'react-router-dom';
import { useEstatisticasLotes } from '@/hooks/predios/useLotes';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building2, CheckCircle } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

export default function LoteDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: lotes, isLoading } = useEstatisticasLotes();
    const lote = lotes?.find(l => l.lote_id === Number(id));

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        );
    }

    if (!lote) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">Lote não encontrado</h2>
                <Button onClick={() => navigate('/predios/lotes')} variant="outline">
                    Voltar para Lotes
                </Button>
            </div>
        );
    }

    const badgeConfig = lote.finalizado
        ? 'bg-secondary text-secondary-foreground'
        : 'bg-primary/10 text-primary';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start gap-4 flex-wrap">
                <Button variant="ghost" size="icon" onClick={() => navigate('/predios/lotes')} className="mt-1">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{lote.lote_nome}</h1>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeConfig}`}>
                            {lote.finalizado ? 'Finalizado' : 'Em andamento'}
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Criado através do Gestor Central
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {lote.total_predios} Prédios englobados
                        </span>
                        <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 ml-2" />
                            {lote.total_cartas_entregues} / {lote.total_meta_cartas} Cartas Entregues
                        </span>
                    </div>
                </div>
            </div>

            {/* TODO: Add Lotes Predios List and Entregas Form here */}
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground font-medium">
                🚧 Lista de Prédios deste Lote e Ferramenta de Entrega em Desenvolvimento
            </div>
        </div>
    );
}
