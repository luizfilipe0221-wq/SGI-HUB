import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, MapPin, Building2, FileStack,
    ListChecks, Upload, Users, FileText, Settings
} from 'lucide-react';

const modules = [
    {
        icon: LayoutDashboard,
        label: 'Dashboard',
        description: 'Visão geral dos prédios e vencimentos',
        path: '/predios/dashboard',
        color: 'from-blue-500/10 to-blue-600/5',
        iconColor: 'text-blue-500',
        border: 'hover:border-blue-300',
    },
    {
        icon: Building2,
        label: 'Prédios',
        description: 'Cadastre e gerencie os prédios',
        path: '/predios/buildings',
        color: 'from-sky-500/10 to-sky-600/5',
        iconColor: 'text-sky-500',
        border: 'hover:border-sky-300',
    },
    {
        icon: ListChecks,
        label: 'Lotes de Trabalho',
        description: 'Gerencie grupos de prédios e entregas',
        path: '/predios/lotes',
        color: 'from-emerald-500/10 to-emerald-600/5',
        iconColor: 'text-emerald-500',
        border: 'hover:border-emerald-300',
    },
    {
        icon: Upload,
        label: 'Upload / Extração',
        description: 'Importe dados e extraia relatórios',
        path: '/predios/uploads',
        color: 'from-orange-500/10 to-orange-600/5',
        iconColor: 'text-orange-500',
        border: 'hover:border-orange-300',
    },
    {
        icon: Users,
        label: 'Usuários',
        description: 'Gerencie usuários e permissões',
        path: '/predios/users',
        color: 'from-pink-500/10 to-pink-600/5',
        iconColor: 'text-pink-500',
        border: 'hover:border-pink-300',
    },
    {
        icon: FileText,
        label: 'Logs de Auditoria',
        description: 'Histórico de ações do sistema',
        path: '/predios/audit-logs',
        color: 'from-amber-500/10 to-amber-600/5',
        iconColor: 'text-amber-500',
        border: 'hover:border-amber-300',
    },
    {
        icon: Settings,
        label: 'Campos Personalizados',
        description: 'Configure campos extras dos prédios',
        path: '/predios/custom-fields',
        color: 'from-slate-500/10 to-slate-600/5',
        iconColor: 'text-slate-500',
        border: 'hover:border-slate-300',
    },
];

export default function PrediosHome() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-start px-6 py-10">
            {/* Header */}
            <div className="text-center mb-10">
                <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                    style={{ background: 'rgba(0,122,255,0.10)' }}
                >
                    <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-[26px] font-bold tracking-tight text-foreground">
                    Gestão de Prédios
                </h2>
                <p className="text-[14px] text-muted-foreground mt-2">
                    Selecione uma funcionalidade para começar
                </p>
            </div>

            {/* Card Grid */}
            <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((mod) => {
                    const Icon = mod.icon;
                    return (
                        <button
                            key={mod.path}
                            onClick={() => navigate(mod.path)}
                            className="group text-left rounded-[16px] border border-[#EEF2F7] bg-white p-5 transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(17,24,39,0.03)] hover:shadow-[0_10px_30px_rgba(17,24,39,0.08)] hover:-translate-y-[2px] active:translate-y-0 relative overflow-hidden flex flex-col items-start"
                        >
                            {/* Borda superior colorida (top accent) */}
                            <div className={`absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${mod.color}`} />

                            <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 bg-gradient-to-br ${mod.color}`}
                            >
                                <Icon className={`h-6 w-6 ${mod.iconColor}`} />
                            </div>
                            <h3 className="text-[16px] font-bold text-gray-900 mb-1.5 transition-colors group-hover:text-primary">
                                {mod.label}
                            </h3>
                            <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                                {mod.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
