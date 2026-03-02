import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileStack, Sparkles } from 'lucide-react';
import { BatchListView } from '@/components/predios/list/BatchListView';

export default function GeneratedListsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listas Geradas</h1>
          <p className="text-muted-foreground">
            Histórico de listas organizadas por lote/data
          </p>
        </div>
        <Button asChild>
          <Link to="/generate">
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Nova Lista
          </Link>
        </Button>
      </div>

      <BatchListView />
    </div>
  );
}
