import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePredios } from '@/hooks/predios/usePredios';
import { useCreateLote } from '@/hooks/predios/useLotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building2, Search, Plus } from 'lucide-react';

export default function LoteNovo() {
    const navigate = useNavigate();
    const { data: predios, isLoading } = usePredios();
    const createLote = useCreateLote();

    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const filtered = useMemo(() => {
        if (!predios) return [];
        const s = search.toLowerCase();
        return predios.filter(p =>
            p.ativo &&
            (
                p.nome.toLowerCase().includes(s) ||
                (p.endereco || '').toLowerCase().includes(s) ||
                (p.territorio || '').includes(s)
            )
        );
    }, [predios, search]);

    function togglePredio(id: number) {
        const s = new Set(selectedIds);
        if (s.has(id)) s.delete(id);
        else s.add(id);
        setSelectedIds(s);
    }

    function toggleAll() {
        if (selectedIds.size === filtered.length && filtered.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(p => p.id)));
        }
    }

    function handleSubmit() {
        if (!nome.trim()) return;
        createLote.mutate(
            {
                loteData: { nome: nome.trim(), descricao: descricao.trim() || null } as any,
                predioIds: Array.from(selectedIds),
            },
            {
                onSuccess: (lote) => navigate(`/predios/lotes/${lote.id}`),
            }
        );
    }

    const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/predios/lotes')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Nova Lista</h1>
                    <p className="text-muted-foreground text-sm">Crie uma lista de prédios para uma rota de entrega</p>
                </div>
            </div>

            {/* Dados do lote */}
            <div className="glass-card rounded-xl p-5 space-y-4">
                <h2 className="font-semibold">Dados da Lista</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Nome *</Label>
                        <Input
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Rota Centro – Março"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Descrição</Label>
                        <Input
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Opcional"
                        />
                    </div>
                </div>
            </div>

            {/* Selecionar Prédios */}
            <div className="glass-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Selecionar Prédios
                    </h2>
                    <Badge variant="secondary">{selectedIds.size} selecionados</Badge>
                </div>

                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, endereço ou território..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    {filtered.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleAll}
                            className="shrink-0"
                        >
                            {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : (
                    <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground text-sm">
                                {search ? 'Nenhum prédio encontrado.' : 'Nenhum prédio ativo cadastrado.'}
                            </div>
                        ) : (
                            filtered.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => togglePredio(p.id)}
                                >
                                    <Checkbox
                                        checked={selectedIds.has(p.id)}
                                        onCheckedChange={() => togglePredio(p.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{p.nome}</p>
                                        {p.endereco && (
                                            <p className="text-xs text-muted-foreground truncate">{p.endereco}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {p.territorio && (
                                            <Badge variant="secondary" className="text-xs font-normal py-0 h-5">
                                                T{p.territorio}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">{p.total_aptos} aptos</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Ações */}
            <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/predios/lotes')}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!nome.trim() || createLote.isPending}
                    className="gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {createLote.isPending ? 'Criando...' : 'Criar Lista'}
                </Button>
            </div>
        </div>
    );
}
