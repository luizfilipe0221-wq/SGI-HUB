import { useCustomFieldDefinitions, useBuildingCustomFieldValues } from '@/hooks/predios/useCustomFields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomFieldsRendererProps {
  buildingId?: string;
  values: Record<string, string | null>;
  onChange: (fieldId: string, value: string | null) => void;
  errors?: Record<string, string>;
}

export function CustomFieldsRenderer({
  buildingId,
  values,
  onChange,
  errors = {},
}: CustomFieldsRendererProps) {
  const { data: fields, isLoading: fieldsLoading } = useCustomFieldDefinitions();
  const { data: savedValues, isLoading: valuesLoading } = useBuildingCustomFieldValues(buildingId || '');

  // Initialize values from saved data
  const isLoading = fieldsLoading || (buildingId && valuesLoading);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!fields || fields.length === 0) {
    return null;
  }

  // Get value for a field (from local state or saved values)
  const getValue = (fieldId: string): string | null => {
    if (values[fieldId] !== undefined) {
      return values[fieldId];
    }
    const saved = savedValues?.find(v => v.field_id === fieldId);
    return saved?.value || null;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Campos Personalizados
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(field => {
          const value = getValue(field.id);
          const error = errors[field.id];

          return (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`custom-${field.id}`}>
                {field.label}
                {field.is_required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {field.field_type === 'text' && (
                <Input
                  id={`custom-${field.id}`}
                  value={value || ''}
                  onChange={(e) => onChange(field.id, e.target.value || null)}
                  placeholder={`Digite ${field.label.toLowerCase()}`}
                />
              )}

              {field.field_type === 'number' && (
                <Input
                  id={`custom-${field.id}`}
                  type="number"
                  value={value || ''}
                  onChange={(e) => onChange(field.id, e.target.value || null)}
                  placeholder="0"
                />
              )}

              {field.field_type === 'boolean' && (
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    id={`custom-${field.id}`}
                    checked={value === 'true'}
                    onCheckedChange={(checked) => onChange(field.id, checked ? 'true' : 'false')}
                  />
                  <Label htmlFor={`custom-${field.id}`} className="font-normal">
                    {value === 'true' ? 'Sim' : 'Não'}
                  </Label>
                </div>
              )}

              {field.field_type === 'select' && field.options && (
                <Select
                  value={value || ''}
                  onValueChange={(v) => onChange(field.id, v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options as string[]).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
