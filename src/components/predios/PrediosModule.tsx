/**
 * PrediosModule
 * Self-contained wrapper for the Gestão de Prédios sub-application.
 * Uses a MemoryRouter so it has its own navigation state,
 * independent of the outer SGI router, and the AuthProvider stub
 * so no separate Supabase login is required.
 */
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/predios/useAuth';
import { AppLayout } from '@/components/predios/layout/AppLayout';
import Dashboard from '@/pages/predios/Dashboard';
import Territories from '@/pages/predios/Territories';
import Buildings from '@/pages/predios/Buildings';
import BuildingForm from '@/pages/predios/BuildingForm';
import BuildingDetail from '@/pages/predios/BuildingDetail';
import GenerateLists from '@/pages/predios/GenerateLists';
import GeneratedListsPage from '@/pages/predios/GeneratedListsPage';
import ListDetail from '@/pages/predios/ListDetail';
import ManageUsers from '@/pages/predios/ManageUsers';
import AuditLogs from '@/pages/predios/AuditLogs';
import Uploads from '@/pages/predios/Uploads';
import ReviewExtraction from '@/pages/predios/ReviewExtraction';
import CustomFieldsManagement from '@/pages/predios/CustomFieldsManagement';

// Error Boundary to show errors instead of blank screen
class PrediosErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center space-y-4">
                    <div className="text-red-500 text-xl font-semibold">⚠️ Erro no módulo de Prédios</div>
                    <pre className="text-left text-xs bg-muted p-4 rounded-xl overflow-auto max-h-96 text-red-700">
                        {this.state.error?.message}
                        {'\n\n'}
                        {this.state.error?.stack}
                    </pre>
                    <p className="text-muted-foreground text-sm">
                        Copie o erro acima e envie para corrigir.
                    </p>
                </div>
            );
        }
        return this.props.children;
    }
}

export function PrediosModule() {
    return (
        <PrediosErrorBoundary>
            <AuthProvider>
                <MemoryRouter initialEntries={['/']} initialIndex={0}>
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/territories" element={<Territories />} />
                            <Route path="/buildings" element={<Buildings />} />
                            <Route path="/buildings/new" element={<BuildingForm />} />
                            <Route path="/buildings/:id" element={<BuildingDetail />} />
                            <Route path="/generate" element={<GenerateLists />} />
                            <Route path="/lists" element={<GeneratedListsPage />} />
                            <Route path="/lists/:id" element={<ListDetail />} />
                            <Route path="/users" element={<ManageUsers />} />
                            <Route path="/audit-logs" element={<AuditLogs />} />
                            <Route path="/uploads" element={<Uploads />} />
                            <Route path="/review/:id" element={<ReviewExtraction />} />
                            <Route path="/custom-fields" element={<CustomFieldsManagement />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </PrediosErrorBoundary>
    );
}
