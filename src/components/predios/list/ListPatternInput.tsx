import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ListPatternInputProps {
  listNumber: number;
  pattern: string;
  onChange: (value: string) => void;
  availableTerritories: number[];
  buildingsPerTerritory?: Record<number, number>;
}

export function ListPatternInput({
  listNumber,
  pattern,
  onChange,
  availableTerritories,
  buildingsPerTerritory = {},
}: ListPatternInputProps) {
  const parsePattern = (str: string): number[] => {
    return str
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= 31);
  };

  const parsed = parsePattern(pattern);
  const isValid = parsed.length > 0;
  
  // Count territories used in this pattern
  const territoryCounts: Record<number, number> = {};
  parsed.forEach(t => {
    territoryCounts[t] = (territoryCounts[t] || 0) + 1;
  });

  // Check for missing territories
  const missingTerritories = parsed.filter(t => !availableTerritories.includes(t));
  const hasMissing = missingTerritories.length > 0;

  // Check if enough buildings available
  const insufficientTerritories: number[] = [];
  Object.entries(territoryCounts).forEach(([tid, count]) => {
    const available = buildingsPerTerritory[Number(tid)] || 0;
    if (available < count) {
      insufficientTerritories.push(Number(tid));
    }
  });

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
      <div className="flex-shrink-0 w-20">
        <Label className="text-sm font-medium text-muted-foreground">
          Lista {listNumber}
        </Label>
      </div>
      
      <div className="flex-1 min-w-0">
        <Input
          value={pattern}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: 1,1,2,2"
          className="font-mono text-sm"
        />
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isValid ? (
          <>
            <Badge variant="secondary" className="text-xs">
              {parsed.length} prédio{parsed.length !== 1 ? 's' : ''}
            </Badge>
            {hasMissing ? (
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                T{missingTerritories.join(',')} não existe
              </Badge>
            ) : insufficientTerritories.length > 0 ? (
              <Badge variant="outline" className="text-xs flex items-center gap-1 border-yellow-500 text-yellow-600">
                <AlertCircle className="w-3 h-3" />
                T{insufficientTerritories.join(',')} poucos prédios
              </Badge>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Inválido
          </Badge>
        )}
      </div>

      {/* Territory preview chips */}
      {isValid && parsed.length > 0 && (
        <div className="flex flex-wrap gap-1 flex-shrink-0 max-w-[120px]">
          {parsed.map((t, i) => (
            <span 
              key={i} 
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                missingTerritories.includes(t) 
                  ? 'bg-destructive/20 text-destructive' 
                  : 'bg-primary/10 text-primary'
              }`}
            >
              T{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
