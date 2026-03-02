import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Building, Home, Layers } from 'lucide-react';

interface UnitGenerationStepProps {
  floorsCount: number;
  onFloorsChange: (value: number) => void;
  apartmentsPerFloor: number;
  onApartmentsPerFloorChange: (value: number) => void;
  numberingStartsAt: 1 | 101;
  onNumberingStartsAtChange: (value: 1 | 101) => void;
}

export function UnitGenerationStep({
  floorsCount,
  onFloorsChange,
  apartmentsPerFloor,
  onApartmentsPerFloorChange,
  numberingStartsAt,
  onNumberingStartsAtChange,
}: UnitGenerationStepProps) {
  const totalApartments = floorsCount * apartmentsPerFloor;

  // Generate preview of apartment numbers
  const getPreviewApartments = () => {
    const preview: Array<{ floor: string; apartments: string[] }> = [];
    const maxFloors = Math.min(floorsCount, 3);
    
    for (let floorIdx = 0; floorIdx < maxFloors; floorIdx++) {
      const floorLabel = numberingStartsAt === 1
        ? (floorIdx === 0 ? 'Térreo' : `${floorIdx}º Andar`)
        : `${floorIdx + 1}º Andar`;
      
      const apartments: string[] = [];
      const maxApts = Math.min(apartmentsPerFloor, 4);
      
      for (let aptIdx = 0; aptIdx < maxApts; aptIdx++) {
        let aptNumber: string;
        
        if (numberingStartsAt === 1) {
          if (floorIdx === 0) {
            aptNumber = String(aptIdx + 1).padStart(2, '0');
          } else {
            aptNumber = String(floorIdx * 100 + aptIdx + 1);
          }
        } else {
          aptNumber = String((floorIdx + 1) * 100 + aptIdx + 1);
        }
        
        apartments.push(aptNumber);
      }
      
      if (apartmentsPerFloor > 4) {
        apartments.push('...');
      }
      
      preview.push({ floor: floorLabel, apartments });
    }
    
    if (floorsCount > 3) {
      preview.push({ floor: '...', apartments: [] });
    }
    
    return preview;
  };

  const preview = getPreviewApartments();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Gerar Andares e Apartamentos</h3>
          <p className="text-sm text-muted-foreground">
            Configure a estrutura do prédio para criar os apartamentos automaticamente
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Floors count */}
        <div className="space-y-2">
          <Label htmlFor="gen-floors" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Quantidade de Andares
          </Label>
          <Input
            id="gen-floors"
            type="number"
            min={1}
            max={100}
            value={floorsCount}
            onChange={(e) => onFloorsChange(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <p className="text-xs text-muted-foreground">
            Inclui o térreo se aplicável
          </p>
        </div>

        {/* Apartments per floor */}
        <div className="space-y-2">
          <Label htmlFor="gen-apts" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Apartamentos por Andar
          </Label>
          <Input
            id="gen-apts"
            type="number"
            min={1}
            max={50}
            value={apartmentsPerFloor}
            onChange={(e) => onApartmentsPerFloorChange(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <p className="text-xs text-muted-foreground">
            Número fixo para todos os andares
          </p>
        </div>
      </div>

      {/* Numbering type */}
      <div className="space-y-3">
        <Label>Tipo de Numeração</Label>
        <RadioGroup
          value={numberingStartsAt.toString()}
          onValueChange={(v) => onNumberingStartsAtChange(parseInt(v) as 1 | 101)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <Label
            htmlFor="numbering-1"
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              numberingStartsAt === 1 ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
            }`}
          >
            <RadioGroupItem value="1" id="numbering-1" className="mt-0.5" />
            <div className="space-y-1">
              <span className="font-medium">Com Térreo (01, 02...)</span>
              <p className="text-xs text-muted-foreground">
                Térreo: 01, 02, 03...<br />
                1º Andar: 101, 102, 103...<br />
                2º Andar: 201, 202, 203...
              </p>
            </div>
          </Label>

          <Label
            htmlFor="numbering-101"
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              numberingStartsAt === 101 ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
            }`}
          >
            <RadioGroupItem value="101" id="numbering-101" className="mt-0.5" />
            <div className="space-y-1">
              <span className="font-medium">Sem Térreo (101, 102...)</span>
              <p className="text-xs text-muted-foreground">
                1º Andar: 101, 102, 103...<br />
                2º Andar: 201, 202, 203...<br />
                3º Andar: 301, 302, 303...
              </p>
            </div>
          </Label>
        </RadioGroup>
      </div>

      {/* Preview */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Prévia da Estrutura</CardTitle>
            <Badge variant="secondary" className="font-semibold">
              {totalApartments} apartamentos
            </Badge>
          </div>
          <CardDescription>
            {floorsCount} {floorsCount === 1 ? 'andar' : 'andares'} × {apartmentsPerFloor} {apartmentsPerFloor === 1 ? 'apartamento' : 'apartamentos'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {preview.map((floor, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-muted-foreground font-medium shrink-0">
                  {floor.floor}
                </span>
                {floor.apartments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {floor.apartments.map((apt, aptIdx) => (
                      <Badge 
                        key={aptIdx} 
                        variant="outline" 
                        className="font-mono text-xs"
                      >
                        {apt}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-3 rounded-lg">
        <strong>Atenção:</strong> Após salvar o prédio, os apartamentos serão gerados automaticamente 
        e não poderão ser regenerados. Edições individuais ainda serão possíveis.
      </p>
    </div>
  );
}
