import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePredio, useUpdatePredio, useDeletePredio } from '@/hooks/predios/usePredios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Trash2, Loader2, MapPin, Building2, Info, ListChecks, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: building, isLoading } = usePredio(id!);
  const updateBuilding = useUpdatePredio();
  const deleteBuilding = useDeletePredio();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string | number | boolean | null>>({});

  const handleStartEdit = () => {
    if (!building) return;
    setEditData({
      nome: building.nome,
      endereco: building.endereco || '',
      territorio: building.territorio || '',
      andares: building.andares || '',
      aptos_por_andar: building.aptos_por_andar || '',
      total_aptos: building.total_aptos || 0,
      observacoes: building.observacoes || '',
      ativo: building.ativo,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!building) return;
    await updateBuilding.mutateAsync({
      id: building.id,
      data: {
        nome: String(editData.nome),
        endereco: String(editData.endereco) || null,
        territorio: String(editData.territorio) || null,
        andares: String(editData.andares) || null,
        aptos_por_andar: String(editData.aptos_por_andar) || null,
        total_aptos: Number(editData.total_aptos) || 0,
        observacoes: String(editData.observacoes) || null,
        ativo: Boolean(editData.ativo),
      }
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!building) return;
    await deleteBuilding.mutateAsync(building.id);
    navigate('/predios/buildings');
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Prédio não encontrado</h2>
        <Button asChild variant="outline">
          <Link to="/predios/buildings">Voltar para a lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{building.nome}</h1>
              {!building.ativo && (
                <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                  Inativo
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {building.endereco || 'Endereço não informado'}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {building.territorio && (
                <span className="flex items-center gap-1">
                  Território {building.territorio}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {building.total_aptos} apartamentos ({building.andares || '?'} andares)
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleStartEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir prédio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O prédio "{building.nome}" e todo o seu histórico serão excluídos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="info" className="gap-2">
            <Info className="w-4 h-4" />
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="lotes" className="gap-2">
            <ListChecks className="w-4 h-4" />
            Lotes e Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Informações Principais */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="font-medium border-b pb-2">Informações Cadastrais</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Andares</span>
                  <p className="font-medium">{building.andares || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Apts / Andar</span>
                  <p className="font-medium">{building.aptos_por_andar || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Total de Apartamentos</span>
                  <p className="font-medium">{building.total_aptos}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Status</span>
                  <p className="font-medium">{building.ativo ? 'Ativo' : 'Inativo'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Data de Criação</span>
                  <p className="font-medium">
                    {format(new Date(building.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Lista Original (Importação)</span>
                  <p className="font-medium">{building.lista_original ? `Aba ${building.lista_original}` : '-'}</p>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="font-medium border-b pb-2">Observações</h3>
              <p className="text-sm whitespace-pre-wrap">
                {building.observacoes || 'Nenhuma observação registrada para este prédio.'}
              </p>
            </div>

            {/* Histórico Planilha Antiga */}
            {building.cartas_entregues_historico && (
              <div className="glass-card rounded-xl p-5 space-y-4 md:col-span-2">
                <h3 className="font-medium border-b pb-2 text-primary">Histórico Importado da Planilha</h3>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <p className="text-sm">
                    <strong>Cartas já entregues:</strong> {building.cartas_entregues_historico}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="lotes" className="space-y-6">
          <div className="glass-card rounded-xl p-8 text-center">
            <ListChecks className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Lotes de Trabalho</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Nesta aba você verá os lotes atuais em que este prédio está inserido e todo o histórico de entregas finalizadas.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/predios/lotes">Ir para Gestão de Lotes</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Prédio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Prédio</Label>
              <Input
                value={String(editData.nome || '')}
                onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={String(editData.endereco || '')}
                onChange={(e) => setEditData({ ...editData, endereco: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Território</Label>
                <Select
                  value={String(editData.territorio || '1')}
                  onValueChange={(v) => setEditData({ ...editData, territorio: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(t => (
                      <SelectItem key={t} value={t.toString()}>T{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Apts</Label>
                <Input
                  type="number"
                  min={0}
                  value={Number(editData.total_aptos || 0)}
                  onChange={(e) => setEditData({ ...editData, total_aptos: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Andares</Label>
                <Input
                  value={String(editData.andares || '')}
                  onChange={(e) => setEditData({ ...editData, andares: e.target.value })}
                  placeholder="Ex: 5 andares"
                />
              </div>
              <div className="space-y-2">
                <Label>Apts por Andar</Label>
                <Input
                  value={String(editData.aptos_por_andar || '')}
                  onChange={(e) => setEditData({ ...editData, aptos_por_andar: e.target.value })}
                  placeholder="Ex: 4"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={String(editData.observacoes || '')}
                onChange={(e) => setEditData({ ...editData, observacoes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <Label htmlFor="ativo-edit" className="cursor-pointer">Prédio Ativo</Label>
              <Switch
                id="ativo-edit"
                checked={Boolean(editData.ativo)}
                onCheckedChange={(c) => setEditData({ ...editData, ativo: c })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateBuilding.isPending}>
              {updateBuilding.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
