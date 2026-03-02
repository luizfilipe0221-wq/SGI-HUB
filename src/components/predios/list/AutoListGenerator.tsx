import { useState } from 'react';
import { useAutoListGeneration } from '@/hooks/predios/useAutoListGeneration';
import { useTerritories } from '@/hooks/predios/useTerritories';
import { AutoGenerationConfig } from '@/lib/predios/list-generation-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, ChevronDown, MapPin, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AutoListGeneratorProps {
  onSuccess?: () => void;
}

export function AutoListGenerator({ onSuccess }: AutoListGeneratorProps) {
  const navigate = useNavigate();
  const { data: territories } = useTerritories();
  const generateLists = useAutoListGeneration();

  const [listsCount, setListsCount] = useState(12);
  const [buildingsPerList, setBuildingsPerList] = useState(4);
  const [lettersPerBuilding, setLettersPerBuilding] = useState(5);
  const [lettersMode, setLettersMode] = useState<'PER_FLOOR' | 'PER_APARTMENT'>('PER_FLOOR');
  const [avoidRecentDays, setAvoidRecentDays] = useState(30);
  const [priorityMode, setPriorityMode] = useState<'expired' | 'least_recent' | 'balanced' | 'all'>('all');
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includedTerritories, setIncludedTerritories] = useState<number[]>([]);
  const [excludedTerritories, setExcludedTerritories] = useState<number[]>([]);

  const [result, setResult] = useState<{ items: unknown[]; warnings: string[] } | null>(null);

  const handleGenerate = async () => {
    const config: AutoGenerationConfig = {
      mode: 'auto',
      lists_count: listsCount,
      buildings_per_list: buildingsPerList,
      letters_per_building: lettersPerBuilding,
      letters_mode: lettersMode,
      avoid_recent_days: avoidRecentDays,
      priority_mode: priorityMode,
      included_territories: includedTerritories.length > 0 ? includedTerritories : undefined,
      excluded_territories: excludedTerritories.length > 0 ? excludedTerritories : undefined,
    };

    try {
      const res = await generateLists.mutateAsync(config);
      setResult({ items: res.items, warnings: res.warnings });
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const toggleTerritory = (id: number, list: 'included' | 'excluded') => {
    if (list === 'included') {
      setIncludedTerritories(prev => 
        prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
      );
      // Remove from excluded if adding to included
      setExcludedTerritories(prev => prev.filter(t => t !== id));
    } else {
      setExcludedTerritories(prev => 
        prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
      );
      // Remove from included if adding to excluded
      setIncludedTerritories(prev => prev.filter(t => t !== id));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Geração Automática
          </CardTitle>
          <CardDescription>
            O sistema seleciona automaticamente os prédios com base na prioridade configurada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic config */}
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
              <Label htmlFor="buildingsPerList">Prédios por Lista</Label>
              <Input
                id="buildingsPerList"
                type="number"
                min={1}
                max={20}
                value={buildingsPerList}
                onChange={(e) => setBuildingsPerList(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lettersPerBuilding">Cartas por Prédio</Label>
              <Input
                id="lettersPerBuilding"
                type="number"
                min={1}
                value={lettersPerBuilding}
                onChange={(e) => setLettersPerBuilding(parseInt(e.target.value) || 5)}
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

          {/* Priority config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={priorityMode}
                onValueChange={(v) => setPriorityMode(v as 'expired' | 'least_recent' | 'balanced' | 'all')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas (vencidos + recentes + balanceado)</SelectItem>
                  <SelectItem value="expired">Vencidos primeiro</SelectItem>
                  <SelectItem value="least_recent">Menos recentes primeiro</SelectItem>
                  <SelectItem value="balanced">Balancear territórios</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define como os prédios serão ordenados para seleção
              </p>
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
                Prédios trabalhados nos últimos X dias não serão incluídos
              </p>
            </div>
          </div>

          {/* Advanced options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Opções Avançadas</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {territories && territories.length > 0 && (
                <div className="space-y-3">
                  <Label>Filtrar Territórios</Label>
                  <div className="flex flex-wrap gap-2">
                    {territories.map(t => {
                      const isIncluded = includedTerritories.includes(t.id);
                      const isExcluded = excludedTerritories.includes(t.id);
                      
                      return (
                        <div key={t.id} className="flex items-center gap-1">
                          <Badge 
                            variant={isIncluded ? "default" : isExcluded ? "destructive" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              if (isIncluded) {
                                setIncludedTerritories(prev => prev.filter(x => x !== t.id));
                              } else if (isExcluded) {
                                setExcludedTerritories(prev => prev.filter(x => x !== t.id));
                              } else {
                                toggleTerritory(t.id, 'included');
                              }
                            }}
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            T{t.id}
                            {t.name && ` - ${t.name}`}
                            {isIncluded && ' ✓'}
                            {isExcluded && ' ✗'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique para incluir (verde) ou clique novamente para excluir (vermelho)
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Resumo da Geração</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total de listas:</span>
                <span className="ml-2 font-medium">{listsCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Prédios totais:</span>
                <span className="ml-2 font-medium">{listsCount * buildingsPerList}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cartas por lista:</span>
                <span className="ml-2 font-medium">{buildingsPerList * lettersPerBuilding}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total de cartas:</span>
                <span className="ml-2 font-medium">{listsCount * buildingsPerList * lettersPerBuilding}</span>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleGenerate} 
              disabled={generateLists.isPending}
              size="lg"
            >
              {generateLists.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Gerar {listsCount} Listas Automaticamente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {result?.warnings && result.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              {result.warnings.map((warning, i) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {result && !generateLists.isPending && (
        <Card className="border-green-500">
          <CardContent className="py-6 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Listas Geradas com Sucesso!</h3>
            <p className="text-muted-foreground mb-4">
              {result.items.length} prédios distribuídos em {listsCount} listas.
            </p>
            <Button onClick={() => navigate('/lists')}>
              Ver Listas Geradas
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
