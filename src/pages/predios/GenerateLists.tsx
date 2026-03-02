import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useListGeneration } from '@/hooks/predios/useListGeneration';
import { useTerritories } from '@/hooks/predios/useTerritories';
import { useBuildings } from '@/hooks/predios/useBuildings';
import { ListConfig } from '@/lib/predios/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/predios/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ListPatternInput } from '@/components/predios/list/ListPatternInput';
import { AutoListGenerator } from '@/components/predios/list/AutoListGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, MapPin, Mail, Calendar, Copy, Wand2, Trash2, AlertTriangle, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BuildingWithStatus } from '@/lib/predios/types';

interface GeneratedItem {
  list_number: number;
  position_in_list: number;
  building_id: string;
  letters_planned: number;
  letters_mode: 'PER_FLOOR' | 'PER_APARTMENT';
  snapshot_last_letter_sent_at: string | null;
  snapshot_due_date: string;
  building: BuildingWithStatus;
  fallback_used?: boolean;
}

function getStatusLabel(status: BuildingWithStatus['status']): string {
  switch (status) {
    case 'expired': return 'Venc.';
    case 'warning': return 'Atenção';
    case 'success': return 'OK';
    case 'completed': return 'Concluído';
    case 'not_started': return 'Novo';
    default: return 'OK';
  }
}

export default function GenerateLists() {
  const navigate = useNavigate();
  const { data: territories, isLoading: loadingTerritories } = useTerritories();
  const { data: buildings } = useBuildings();
  const generateLists = useListGeneration();

  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [listsCount, setListsCount] = useState(12);
  const [avoidRecentDays, setAvoidRecentDays] = useState(30);
  const [lettersPlanned, setLettersPlanned] = useState(5);
  const [lettersMode, setLettersMode] = useState<'PER_FLOOR' | 'PER_APARTMENT'>('PER_FLOOR');
  
  // Individual patterns for each list (manual mode)
  const [patterns, setPatterns] = useState<string[]>(['1,1,2,2']);
  
  const [generatedResult, setGeneratedResult] = useState<{ items: GeneratedItem[], warnings: string[] } | null>(null);

  // Calculate buildings per territory
  const buildingsPerTerritory = useMemo(() => {
    const counts: Record<number, number> = {};
    buildings?.forEach(b => {
      counts[b.territory_id] = (counts[b.territory_id] || 0) + 1;
    });
    return counts;
  }, [buildings]);

  // Available territory IDs
  const availableTerritories = useMemo(() => {
    return territories?.map(t => t.id) || [];
  }, [territories]);

  // Sync patterns array with listsCount
  useEffect(() => {
    setPatterns(prev => {
      if (prev.length === listsCount) return prev;
      
      if (prev.length < listsCount) {
        const newPatterns = [...prev];
        while (newPatterns.length < listsCount) {
          newPatterns.push(prev[0] || '');
        }
        return newPatterns;
      } else {
        return prev.slice(0, listsCount);
      }
    });
  }, [listsCount]);

  const updatePattern = (index: number, value: string) => {
    setPatterns(prev => {
      const newPatterns = [...prev];
      newPatterns[index] = value;
      return newPatterns;
    });
  };

  const copyFirstToAll = () => {
    const first = patterns[0] || '';
    setPatterns(patterns.map(() => first));
  };

  const autoFillSequence = () => {
    const firstPattern = patterns[0] || '1,1,2,2';
    const parsed = firstPattern.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    if (parsed.length === 0) return;
    
    const counts: Record<number, number> = {};
    parsed.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    const uniqueTerritories = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const countPerTerritory = Object.values(counts)[0] || 2;
    
    const allTerritoryIds = availableTerritories.sort((a, b) => a - b);
    
    const newPatterns: string[] = [];
    let startIdx = 0;
    
    for (let i = 0; i < listsCount; i++) {
      const territoryPairs: number[] = [];
      for (let j = 0; j < uniqueTerritories.length; j++) {
        const idx = (startIdx + j) % allTerritoryIds.length;
        const tid = allTerritoryIds[idx];
        for (let k = 0; k < countPerTerritory; k++) {
          territoryPairs.push(tid);
        }
      }
      newPatterns.push(territoryPairs.join(','));
      startIdx += uniqueTerritories.length;
    }
    
    setPatterns(newPatterns);
  };

  const clearAll = () => {
    setPatterns(patterns.map(() => ''));
  };

  const handleGenerateManual = async () => {
    const config: ListConfig = {
      lists_count: listsCount,
      per_list: 0,
      avoid_recent_days: avoidRecentDays,
      prioritize_mode: 'expired',
      letters_mode: lettersMode,
      letters_planned: lettersPlanned,
    };
    
    const result = await generateLists.mutateAsync({ config, patterns });
    setGeneratedResult({
      items: result.items,
      warnings: result.warnings,
    });
  };

  const parsePattern = (str: string): number[] => {
    return str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
  };
  
  const validPatternsCount = patterns.filter(p => parsePattern(p).length > 0).length;
  const canGenerate = validPatternsCount === listsCount;

  const groupedLists = generatedResult?.items.reduce((acc, item) => {
    if (!acc[item.list_number]) {
      acc[item.list_number] = [];
    }
    acc[item.list_number].push(item);
    return acc;
  }, {} as Record<number, GeneratedItem[]>);

  if (loadingTerritories) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerar Listas de Trabalho</h1>
        <p className="text-muted-foreground">
          Escolha o modo de geração: automático (recomendado) ou manual
        </p>
      </div>

      {/* Mode selection */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'auto' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="auto" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Automático
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="mt-6">
          <AutoListGenerator onSuccess={() => setGeneratedResult(null)} />
        </TabsContent>

        <TabsContent value="manual" className="mt-6 space-y-6">
          {/* Manual mode - existing code */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração Geral</CardTitle>
              <CardDescription>
                Defina quantidade de listas e parâmetros globais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="listsCount">Quantidade de Listas</Label>
                  <Input
                    id="listsCount"
                    type="number"
                    min={1}
                    max={50}
                    value={listsCount}
                    onChange={(e) => setListsCount(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avoidDays">Evitar Recentes (dias)</Label>
                  <Input
                    id="avoidDays"
                    type="number"
                    min={0}
                    value={avoidRecentDays}
                    onChange={(e) => setAvoidRecentDays(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Evita prédios trabalhados nos últimos X dias
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lettersPlanned">Cartas por Prédio</Label>
                  <Input
                    id="lettersPlanned"
                    type="number"
                    min={1}
                    value={lettersPlanned}
                    onChange={(e) => setLettersPlanned(parseInt(e.target.value) || 5)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Modo de Cartas</Label>
                  <Select
                    value={lettersMode}
                    onValueChange={(v) => setLettersMode(v as 'PER_FLOOR' | 'PER_APARTMENT')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_FLOOR">Por Andar</SelectItem>
                      <SelectItem value="PER_APARTMENT">Por Apartamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patterns per List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Padrões por Lista</CardTitle>
                  <CardDescription>
                    Defina o padrão de territórios para cada lista (ex: 1,1,2,2 = 2 prédios do T1 + 2 do T2)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyFirstToAll}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar 1ª para todas
                  </Button>
                  <Button variant="outline" size="sm" onClick={autoFillSequence}>
                    <Wand2 className="w-4 h-4 mr-1" />
                    Preencher sequência
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {patterns.map((pattern, index) => (
                  <ListPatternInput
                    key={index}
                    listNumber={index + 1}
                    pattern={pattern}
                    onChange={(value) => updatePattern(index, value)}
                    availableTerritories={availableTerritories}
                    buildingsPerTerritory={buildingsPerTerritory}
                  />
                ))}
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {validPatternsCount}/{listsCount} padrões válidos
                </div>
                <Button 
                  onClick={handleGenerateManual} 
                  disabled={generateLists.isPending || !canGenerate}
                  size="lg"
                >
                  {generateLists.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Gerar {listsCount} Listas
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {generatedResult?.warnings && generatedResult.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  {generatedResult.warnings.map((warning, i) => (
                    <li key={i} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Generated Results */}
          {generatedResult && groupedLists && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Listas Geradas ({Object.keys(groupedLists).length})
                </h2>
                <Button onClick={() => navigate('/lists')}>
                  Ver Todas as Listas
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(groupedLists).map(([listNum, items]) => (
                  <Card key={listNum}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Lista {listNum}</CardTitle>
                      <CardDescription>{items.length} prédio(s)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {items.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-lg space-y-2 ${
                            item.fallback_used 
                              ? 'bg-accent/50 border border-accent' 
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{item.building.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{item.building.address}</p>
                            </div>
                            <StatusBadge 
                              status={item.building.status} 
                              label={getStatusLabel(item.building.status)} 
                            />
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              T{item.building.territory_id}
                              {item.fallback_used && (
                                <span className="text-destructive">(fallback)</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {item.letters_planned} cartas
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Venc: {format(new Date(item.snapshot_due_date), "dd/MM", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
