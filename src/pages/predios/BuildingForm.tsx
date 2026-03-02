import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateBuilding } from '@/hooks/predios/useBuildings';
import { useGenerateUnits } from '@/hooks/predios/useApartments';
import { useCustomFieldDefinitions, useSaveCustomFieldValues } from '@/hooks/predios/useCustomFields';
import { CustomFieldsRenderer } from '@/components/predios/building/CustomFieldsRenderer';
import { UnitGenerationStep } from '@/components/predios/building/UnitGenerationStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Loader2, Building, Home } from 'lucide-react';
import { z } from 'zod';

const buildingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  address: z.string().min(1, 'Endereço é obrigatório').max(200),
  territory_id: z.number().min(1).max(31),
  floors_count: z.number().min(1, 'Mínimo 1 andar'),
  apartments_per_floor: z.number().min(0).nullable(),
  apartments_total: z.number().min(0).nullable(),
  default_cycle_days: z.number().min(1, 'Mínimo 1 dia'),
  custom_cycle_days: z.number().min(1).nullable(),
  notes: z.string().max(500).nullable(),
});

type FormStep = 'basic' | 'units';

export default function BuildingForm() {
  const navigate = useNavigate();
  const createBuilding = useCreateBuilding();
  const generateUnits = useGenerateUnits();
  const saveCustomFieldValues = useSaveCustomFieldValues();
  const { data: customFields } = useCustomFieldDefinitions();
  
  const [step, setStep] = useState<FormStep>('basic');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    territory_id: 1,
    floors_count: 1,
    apartments_per_floor: null as number | null,
    apartments_total: null as number | null,
    default_cycle_days: 30,
    custom_cycle_days: null as number | null,
    notes: '',
  });
  
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Unit generation config
  const [generateUnitsEnabled, setGenerateUnitsEnabled] = useState(true);
  const [genFloorsCount, setGenFloorsCount] = useState(5);
  const [genApartmentsPerFloor, setGenApartmentsPerFloor] = useState(4);
  const [numberingStartsAt, setNumberingStartsAt] = useState<1 | 101>(1);

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = buildingSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // If units generation is enabled, go to units step
    if (generateUnitsEnabled) {
      // Sync floors count from form to unit generation
      setGenFloorsCount(formData.floors_count);
      if (formData.apartments_per_floor) {
        setGenApartmentsPerFloor(formData.apartments_per_floor);
      }
      setStep('units');
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    try {
      const building = await createBuilding.mutateAsync({
        ...formData,
        notes: formData.notes || null,
        // Override with generation values if enabled
        floors_count: generateUnitsEnabled ? genFloorsCount : formData.floors_count,
        apartments_per_floor: generateUnitsEnabled ? genApartmentsPerFloor : formData.apartments_per_floor,
        apartments_total: generateUnitsEnabled ? genFloorsCount * genApartmentsPerFloor : formData.apartments_total,
      });
      
      // Save custom field values if any
      if (Object.keys(customFieldsData).length > 0 && building?.id) {
        await saveCustomFieldValues.mutateAsync({
          buildingId: building.id,
          values: customFieldsData,
        });
      }

      // Generate units if enabled
      if (generateUnitsEnabled && building?.id) {
        await generateUnits.mutateAsync({
          buildingId: building.id,
          floorsCount: genFloorsCount,
          apartmentsPerFloor: genApartmentsPerFloor,
          numberingStartsAt,
        });
      }
      
      navigate('/buildings');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleNumberChange = (field: string, value: string, allowNull = false) => {
    if (value === '' && allowNull) {
      setFormData(prev => ({ ...prev, [field]: null }));
    } else {
      const num = parseInt(value);
      if (!isNaN(num) && num >= 0) {
        setFormData(prev => ({ ...prev, [field]: num }));
      }
    }
  };

  const isSubmitting = createBuilding.isPending || generateUnits.isPending || saveCustomFieldValues.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => step === 'units' ? setStep('basic') : navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novo Prédio</h1>
          <p className="text-muted-foreground">
            {step === 'basic' ? 'Passo 1: Informações básicas' : 'Passo 2: Gerar apartamentos'}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          step === 'basic' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          <Building className="w-4 h-4" />
          Dados
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          step === 'units' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          <Home className="w-4 h-4" />
          Unidades
        </div>
      </div>

      {step === 'basic' ? (
        <form onSubmit={handleBasicSubmit} className="glass-card rounded-xl p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="name">Nome do Prédio *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Edifício Aurora"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Ex: Rua das Flores, 123"
              />
              {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
            </div>

            <div className="space-y-2">
              <Label>Território *</Label>
              <Select
                value={formData.territory_id.toString()}
                onValueChange={(v) => setFormData(prev => ({ ...prev, territory_id: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(t => (
                    <SelectItem key={t} value={t.toString()}>
                      Território {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="floors">Número de Andares *</Label>
              <Input
                id="floors"
                type="number"
                min={1}
                value={formData.floors_count}
                onChange={(e) => handleNumberChange('floors_count', e.target.value)}
              />
              {errors.floors_count && <p className="text-sm text-destructive">{errors.floors_count}</p>}
            </div>
          </div>

          {/* Generate Units Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="generate-units" className="font-medium cursor-pointer">
                Gerar andares e apartamentos automaticamente
              </Label>
              <p className="text-sm text-muted-foreground">
                Cria a estrutura completa do prédio com checklist de cartas
              </p>
            </div>
            <Switch
              id="generate-units"
              checked={generateUnitsEnabled}
              onCheckedChange={setGenerateUnitsEnabled}
            />
          </div>

          {/* Only show manual apartments config if not generating */}
          {!generateUnitsEnabled && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Apartamentos (opcional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aptsPerFloor">Apartamentos por Andar</Label>
                  <Input
                    id="aptsPerFloor"
                    type="number"
                    min={0}
                    value={formData.apartments_per_floor ?? ''}
                    onChange={(e) => handleNumberChange('apartments_per_floor', e.target.value, true)}
                    placeholder="Ex: 4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aptsTotal">Total de Apartamentos</Label>
                  <Input
                    id="aptsTotal"
                    type="number"
                    min={0}
                    value={formData.apartments_total ?? ''}
                    onChange={(e) => handleNumberChange('apartments_total', e.target.value, true)}
                    placeholder="Ex: 48"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cycle */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Ciclo de Vencimento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCycle">Ciclo Padrão (dias) *</Label>
                <Input
                  id="defaultCycle"
                  type="number"
                  min={1}
                  value={formData.default_cycle_days}
                  onChange={(e) => handleNumberChange('default_cycle_days', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customCycle">Ciclo Personalizado (dias)</Label>
                <Input
                  id="customCycle"
                  type="number"
                  min={1}
                  value={formData.custom_cycle_days ?? ''}
                  onChange={(e) => handleNumberChange('custom_cycle_days', e.target.value, true)}
                  placeholder="Sobrescreve o padrão"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Anotações sobre o prédio..."
              rows={3}
            />
          </div>

          {/* Custom Fields */}
          {customFields && customFields.length > 0 && (
            <CustomFieldsRenderer
              values={customFieldsData}
              onChange={(fieldId, value) => setCustomFieldsData(prev => ({ ...prev, [fieldId]: value }))}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit">
              {generateUnitsEnabled ? (
                <>
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Cadastrar Prédio
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="glass-card rounded-xl p-6 space-y-6">
          <UnitGenerationStep
            floorsCount={genFloorsCount}
            onFloorsChange={setGenFloorsCount}
            apartmentsPerFloor={genApartmentsPerFloor}
            onApartmentsPerFloorChange={setGenApartmentsPerFloor}
            numberingStartsAt={numberingStartsAt}
            onNumberingStartsAtChange={setNumberingStartsAt}
          />

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setStep('basic')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cadastrar Prédio
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
