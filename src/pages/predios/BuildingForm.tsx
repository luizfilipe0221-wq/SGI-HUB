import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreatePredio } from '@/hooks/predios/usePredios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BuildingForm() {
  const navigate = useNavigate();
  const createPredio = useCreatePredio();

  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    territorio: '1',
    andares: '',
    aptos_por_andar: '',
    total_aptos: 0,
    observacoes: '',
    ativo: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('O nome do prédio é obrigatório');
      return;
    }

    try {
      await createPredio.mutateAsync({
        nome: formData.nome,
        endereco: formData.endereco || null,
        territorio: formData.territorio || null,
        andares: formData.andares || null,
        aptos_por_andar: formData.aptos_por_andar || null,
        total_aptos: Number(formData.total_aptos) || 0,
        observacoes: formData.observacoes || null,
        ativo: formData.ativo,
        cartas_entregues_historico: null,
        lista_original: null,
      });

      navigate('/predios/buildings');
    } catch (error) {
      // Error handled by the hook
    }
  };

  const handleNumberChange = (field: 'total_aptos', value: string) => {
    if (value === '') {
      setFormData(prev => ({ ...prev, [field]: 0 }));
    } else {
      const num = parseInt(value);
      if (!isNaN(num) && num >= 0) {
        setFormData(prev => ({ ...prev, [field]: num }));
      }
    }
  };

  const isSubmitting = createPredio.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novo Prédio</h1>
          <p className="text-muted-foreground">
            Cadastrar um novo prédio no sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="nome">Nome do Prédio *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Edifício Aurora"
              required
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Ex: Rua das Flores, 123"
            />
          </div>

          <div className="space-y-2">
            <Label>Território</Label>
            <Select
              value={formData.territorio}
              onValueChange={(v) => setFormData(prev => ({ ...prev, territorio: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um território" />
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
            <Label htmlFor="total_aptos">Total de Apartamentos</Label>
            <Input
              id="total_aptos"
              type="number"
              min={0}
              value={formData.total_aptos || ''}
              onChange={(e) => handleNumberChange('total_aptos', e.target.value)}
              placeholder="Ex: 48"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="andares">Andares (Ex: 1 ao 5º)</Label>
            <Input
              id="andares"
              value={formData.andares}
              onChange={(e) => setFormData(prev => ({ ...prev, andares: e.target.value }))}
              placeholder="Ex: 5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aptos_por_andar">Aptos por Andar</Label>
            <Input
              id="aptos_por_andar"
              value={formData.aptos_por_andar}
              onChange={(e) => setFormData(prev => ({ ...prev, aptos_por_andar: e.target.value }))}
              placeholder="Ex: 4"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={formData.observacoes}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            placeholder="Anotações sobre interfone, zelador, restrições..."
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="space-y-1">
            <Label htmlFor="ativo" className="font-medium cursor-pointer">
              Prédio Ativo
            </Label>
            <p className="text-sm text-muted-foreground">
              Prédios inativos não aparecem na geração de lotes operacionais.
            </p>
          </div>
          <Switch
            id="ativo"
            checked={formData.ativo}
            onCheckedChange={(c) => setFormData(prev => ({ ...prev, ativo: c }))}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Building2 className="w-4 h-4 mr-2" />
            Cadastrar Prédio
          </Button>
        </div>
      </form>
    </div>
  );
}
