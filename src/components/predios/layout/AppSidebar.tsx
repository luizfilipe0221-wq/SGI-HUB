import { Link, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard, MapPin, ListChecks, FileStack, LogOut, Menu, Users, FileText, Shield, Upload, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/predios/useAuth';
import { usePermissions } from '@/hooks/predios/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PERMISSIONS } from '@/lib/predios/auth-types';
const navItems = [{
  icon: LayoutDashboard,
  label: 'Dashboard',
  path: '/predios',
  permission: PERMISSIONS.VIEW_DASHBOARD
}, {
  icon: MapPin,
  label: 'Territórios',
  path: '/predios/territories',
  permission: PERMISSIONS.VIEW_PREDIOS
}, {
  icon: Building2,
  label: 'Prédios',
  path: '/predios/buildings',
  permission: PERMISSIONS.VIEW_PREDIOS
}, {
  icon: FileStack,
  label: 'Gerar Listas',
  path: '/predios/generate',
  permission: PERMISSIONS.GENERATE_LISTS
}, {
  icon: ListChecks,
  label: 'Listas Geradas',
  path: '/predios/lists',
  permission: PERMISSIONS.GENERATE_LISTS
}, {
  icon: Upload,
  label: 'Upload/Extração',
  path: '/predios/uploads',
  permission: PERMISSIONS.UPLOAD_FILES
}];
const adminItems = [{
  icon: Users,
  label: 'Usuários',
  path: '/predios/users',
  permission: PERMISSIONS.MANAGE_USERS
}, {
  icon: FileText,
  label: 'Logs de Auditoria',
  path: '/predios/audit-logs',
  permission: PERMISSIONS.VIEW_AUDIT_LOGS
}, {
  icon: Settings,
  label: 'Campos Personalizados',
  path: '/predios/custom-fields',
  permission: PERMISSIONS.MANAGE_USERS
}];
interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}
export function AppSidebar({
  isOpen,
  onToggle
}: AppSidebarProps) {
  const location = useLocation();
  const {
    signOut,
    user
  } = useAuth();
  const {
    isAdmin,
    hasPermission,
    role
  } = usePermissions();
  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));
  const visibleAdminItems = adminItems.filter(item => hasPermission(item.permission));
  return <>
    {/* Mobile overlay */}
    {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />}

    {/* Sidebar */}
    <aside className={cn("fixed top-0 left-0 z-50 h-screen w-64 bg-sidebar transform transition-transform duration-200 ease-in-out lg:translate-x-0", isOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-sidebar-foreground truncate">
              Gestor de Prédios
            </h1>
            <p className="text-xs text-sidebar-foreground/60 truncate">
            </p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={onToggle}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map(item => {
            const isActive = location.pathname === item.path || item.path !== '/' && location.pathname.startsWith(item.path);
            return <Link key={item.path} to={item.path} onClick={() => window.innerWidth < 1024 && onToggle()} className={cn("sidebar-item", isActive && "sidebar-item-active")}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>;
          })}

          {/* Admin section */}
          {visibleAdminItems.length > 0 && <>
            <div className="pt-4 pb-2">
              <div className="flex items-center gap-2 px-3 text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                <Shield className="w-3 h-3" />
                Administração
              </div>
            </div>
            {visibleAdminItems.map(item => {
              const isActive = location.pathname === item.path;
              return <Link key={item.path} to={item.path} onClick={() => window.innerWidth < 1024 && onToggle()} className={cn("sidebar-item", isActive && "sidebar-item-active")}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>;
            })}
          </>}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email}
            </p>
            {role && <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1 text-xs">
              {isAdmin ? 'Admin' : 'Usuário'}
            </Badge>}
          </div>
          <button onClick={signOut} className="sidebar-item w-full text-left hover:text-destructive">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  </>;
}