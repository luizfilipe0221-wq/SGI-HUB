import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAllCustomFieldDefinitions,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  CustomFieldDefinition,
} from '@/hooks/predios/useCustomFields';
import { PermissionGate } from '@/components/predios/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Edit, Trash2, Loader2, GripVertical } from 'lucide-react';

const FIELD_TYPE_LABELS = {
  text: 'Texto',
  number: 'Número',
  boolean: 'Sim/Não',
  select: 'Seleção',
};

export default function CustomFieldsManagement() {
  const navigate = useNavigate();
  const { data: fields, isLoading } = useAllCustomFieldDefinitions();
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    field_type: 'text' as 'text' | 'number' | 'boolean' | 'select',
    options: '',
    is_required: false,
    display_order: 0,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      field_type: 'text',
      options: '',
      is_required: false,
      display_order: fields?.length || 0,
    });
    setEditingField(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      options: field.options ? (field.options as string[]).join(', ') : '',
      is_required: field.is_required,
      display_order: field.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      name: formData.name.toLowerCase().replace(/\s+/g, '_'),
      label: formData.label,
      field_type: formData.field_type,
      options: formData.field_type === 'select' && formData.options
        ? formData.options.split(',').map(o => o.trim()).filter(Boolean)
        : undefined,
      is_required: formData.is_required,
      display_order: formData.display_order,
    };

    if (editingField) {
      await updateField.mutateAsync({ id: editingField.id, ...data });
    } else {
      await createField.mutateAsync(data);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteField.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const activeFields = fields?.filter(f => f.is_active) || [];
  const inactiveFields = fields?.filter(f => !f.is_active) || [];

  return (
    <PermissionGate permission="manage_users" showDenied>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Campos Personalizados</h1>
            <p className="text-muted-foreground">
              Gerencie campos adicionais para os prédios
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Campo
          </Button>
        </div>

        {/* Fields Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeFields.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum campo personalizado criado.</p>
              <Button variant="link" onClick={handleOpenCreate}>
                Criar primeiro campo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeFields.map(field => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{field.name}</TableCell>
                    <TableCell>{field.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {FIELD_TYPE_LABELS[field.field_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.is_required ? (
                        <Badge className="bg-primary/10 text-primary">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(field)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(field.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Inactive Fields */}
        {inactiveFields.length > 0 && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Campos Desativados ({inactiveFields.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {inactiveFields.map(field => (
                <Badge key={field.id} variant="secondary" className="opacity-60">
                  {field.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingField ? 'Editar Campo' : 'Novo Campo Personalizado'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome (identificador)</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: numero_sindico"
                />
                <p className="text-xs text-muted-foreground">
                  Usado internamente. Será convertido para snake_case.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Label (exibição)</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData(p => ({ ...p, label: e.target.value }))}
                  placeholder="Ex: Número do Síndico"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Campo</Label>
                <Select
                  value={formData.field_type}
                  onValueChange={(v) => setFormData(p => ({ ...p, field_type: v as typeof formData.field_type }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="boolean">Sim/Não</SelectItem>
                    <SelectItem value="select">Seleção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.field_type === 'select' && (
                <div className="space-y-2">
                  <Label>Opções (separadas por vírgula)</Label>
                  <Input
                    value={formData.options}
                    onChange={(e) => setFormData(p => ({ ...p, options: e.target.value }))}
                    placeholder="Ex: Opção 1, Opção 2, Opção 3"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, is_required: checked }))}
                />
                <Label htmlFor="is_required">Campo obrigatório</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={handleSave}
                disabled={!formData.name || !formData.label || createField.isPending || updateField.isPending}
              >
                {(createField.isPending || updateField.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingField ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover campo?</AlertDialogTitle>
              <AlertDialogDescription>
                O campo será desativado e não aparecerá mais nos formulários.
                Os dados existentes serão mantidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGate>
  );
}
