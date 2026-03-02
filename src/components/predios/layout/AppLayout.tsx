import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Map path segments to display names
const pathNames: Record<string, string> = {
  territories: 'Territórios',
  buildings: 'Prédios',
  generate: 'Gerar Listas',
  lists: 'Listas Geradas',
  uploads: 'Upload / Extração',
  users: 'Usuários',
  'audit-logs': 'Logs de Auditoria',
  'custom-fields': 'Campos Personalizados',
  dashboard: 'Dashboard',
  new: 'Novo Prédio',
  review: 'Revisão',
};

function getPageTitle(pathname: string) {
  const segments = pathname.replace('/predios', '').split('/').filter(Boolean);
  if (segments.length === 0) return null; // Home, no title needed
  const name = pathNames[segments[0]];
  return name || segments[0];
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const isHome = !pageTitle;

  return (
    <div className="min-h-[calc(100vh-160px)]">
      {/* Sub-header with back button (shown on inner pages) */}
      {!isHome && (
        <div className="flex items-center gap-3 px-6 pt-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/predios')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="text-[13px]">Gestão de Prédios</span>
            <span className="text-[13px]">/</span>
            <span className="text-[13px] font-medium text-foreground">{pageTitle}</span>
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className={!isHome ? 'px-6 pb-8' : ''}>
        <Outlet />
      </div>
    </div>
  );
}
