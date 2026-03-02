import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGeneratedLists } from '@/hooks/predios/useGeneratedLists';
import { useListItemsWithProgress } from '@/hooks/predios/useListExecution';
import { ListItemCard } from '@/components/predios/list/ListItemCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileStack, Printer, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lists } = useGeneratedLists();
  const { data: items, isLoading } = useListItemsWithProgress(id!);
  
  const [selectedList, setSelectedList] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const list = lists?.find(l => l.id === id);

  // Group items by list_number
  const groupedLists = useMemo(() => {
    if (!items) return {};
    return items.reduce((acc, item) => {
      if (!acc[item.list_number]) {
        acc[item.list_number] = [];
      }
      acc[item.list_number].push(item);
      return acc;
    }, {} as Record<number, typeof items>);
  }, [items]);

  const listNumbers = Object.keys(groupedLists).map(Number).sort((a, b) => a - b);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    let filtered = items;
    
    // Filter by list number
    if (selectedList !== 'all') {
      filtered = filtered.filter(item => item.list_number === parseInt(selectedList));
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (statusFilter === 'done') return item.is_completed;
        if (statusFilter === 'in_progress') return !item.is_completed && item.completed_letters_count > 0;
        if (statusFilter === 'pending') return !item.is_completed && item.completed_letters_count === 0;
        return true;
      });
    }
    
    return filtered;
  }, [items, selectedList, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!items) return { total: 0, done: 0, inProgress: 0, pending: 0, totalLetters: 0, completedLetters: 0 };
    
    return {
      total: items.length,
      done: items.filter(i => i.is_completed).length,
      inProgress: items.filter(i => !i.is_completed && i.completed_letters_count > 0).length,
      pending: items.filter(i => !i.is_completed && i.completed_letters_count === 0).length,
      totalLetters: items.reduce((sum, i) => sum + i.letters_planned, 0),
      completedLetters: items.reduce((sum, i) => sum + i.completed_letters_count, 0),
    };
  }, [items]);

  const overallProgress = stats.totalLetters > 0 
    ? Math.round((stats.completedLetters / stats.totalLetters) * 100)
    : 0;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Lista não encontrada</h2>
        <Button asChild variant="outline">
          <Link to="/lists">Voltar para listas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{list.name}</h1>
          <p className="text-muted-foreground">
            {format(new Date(list.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{list.name}</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(list.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Overview */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total de Prédios</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-5 h-5" />
                {stats.done}
              </div>
              <div className="text-xs text-muted-foreground">Concluídos</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                <Clock className="w-5 h-5" />
                {stats.inProgress}
              </div>
              <div className="text-xs text-muted-foreground">Em Andamento</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-muted-foreground flex items-center justify-center gap-1">
                <AlertCircle className="w-5 h-5" />
                {stats.pending}
              </div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso de Cartas</span>
              <span className="font-medium">{stats.completedLetters} / {stats.totalLetters} cartas ({overallProgress}%)</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <Select value={selectedList} onValueChange={setSelectedList}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar lista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as listas</SelectItem>
            {listNumbers.map(num => (
              <SelectItem key={num} value={num.toString()}>
                Lista {num}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="done">Concluídos</SelectItem>
          </SelectContent>
        </Select>

        {(selectedList !== 'all' || statusFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSelectedList('all');
              setStatusFilter('all');
            }}
          >
            Limpar filtros
          </Button>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          {filteredItems.length} {filteredItems.length === 1 ? 'prédio' : 'prédios'}
        </div>
      </div>

      {/* List Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileStack className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum prédio encontrado com os filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <ListItemCard key={item.id} item={item} listId={id!} />
          ))}
        </div>
      )}
    </div>
  );
}
