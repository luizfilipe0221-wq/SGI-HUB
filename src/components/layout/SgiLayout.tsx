/**
 * SgiLayout — Soft UI Dashboard 3 Style
 * Shell principal do SGI com sidebar fixa, topbar e seletor de módulos.
 */
import React, { useState } from "react";
import {
    Building2, Phone, LayoutDashboard, Users, FilePlus, ListChecks,
    BarChart2, RefreshCw, Map, LogOut, HelpCircle, BookOpen, Search,
    Plus, Bell, UserCircle, Menu, X, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logoutAdmin, getAdminSession } from "@/lib/auth";

// ─── Sidebar nav config per module ───────────────────────────────────────────

const LISTA_NAV = [
    {
        section: "PRINCIPAL", items: [
            { key: "overview", icon: LayoutDashboard, label: "Dashboard" },
            { key: "contatos", icon: Users, label: "Contatos" },
            { key: "territorios", icon: Map, label: "Territórios" },
        ]
    },
    {
        section: "LISTAS", items: [
            { key: "create", icon: FilePlus, label: "Criar Lista" },
            { key: "manage", icon: ListChecks, label: "Listas" },
            { key: "results", icon: BarChart2, label: "Resultados" },
            { key: "retornos", icon: RefreshCw, label: "Retornos" },
        ]
    },
];

const PREDIOS_NAV = [
    {
        section: "PRINCIPAL", items: [
            { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { key: "territories", icon: Map, label: "Territórios" },
            { key: "buildings", icon: Building2, label: "Prédios" },
        ]
    },
    {
        section: "OPERAÇÕES", items: [
            { key: "generate", icon: FilePlus, label: "Gerar Listas" },
            { key: "lists", icon: ListChecks, label: "Listas Geradas" },
            { key: "uploads", icon: BarChart2, label: "Upload/Extração" },
        ]
    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SgiLayoutProps {
    activeModule: "lista-telefonica" | "gestao-predios";
    onChangeModule: (mod: "lista-telefonica" | "gestao-predios") => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    pageTitle?: string;
    children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SgiLayout({
    activeModule, onChangeModule, activeTab, onTabChange, pageTitle, children
}: SgiLayoutProps) {
    const navigate = useNavigate();
    const admin = getAdminSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = activeModule === "lista-telefonica" ? LISTA_NAV : PREDIOS_NAV;
    const currentTitle = pageTitle ?? (activeModule === "lista-telefonica" ? "Lista Telefônica" : "Gestão de Prédios");

    function handleNavClick(key: string) {
        if (activeModule === "lista-telefonica") {
            onTabChange?.(key);
        } else {
            navigate(`/predios/${key}`);
        }
        setSidebarOpen(false);
    }

    function handleLogout() {
        logoutAdmin();
        navigate("/admin/login");
    }

    const isActiveKey = (key: string) => {
        if (activeModule === "lista-telefonica") return activeTab === key;
        return window.location.pathname.includes(key);
    };

    return (
        <div className="flex min-h-screen" style={{ background: "#F8F9FA", fontFamily: "'Nunito', sans-serif" }}>

            {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <aside
                className={`fixed top-0 left-0 h-screen w-[260px] z-50 flex flex-col transition-transform duration-300 bg-white border-r
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
            >
                {/* Logo */}
                <div className="px-6 pt-7 pb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white shadow-sm shadow-primary/20">
                        <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[16px] font-bold text-gray-900 leading-tight">SGI Hub</p>
                        <p className="text-[12px] text-gray-500 font-medium mt-0.5">Gestão Integrada</p>
                    </div>
                    <button className="lg:hidden ml-auto text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 mb-4">
                    <div className="h-px bg-gray-100" />
                </div>

                {/* Nav sections */}
                <nav className="flex-1 overflow-y-auto px-4 space-y-6">
                    {navItems.map(({ section, items }) => (
                        <div key={section}>
                            <p className="text-[11px] font-bold text-gray-400 tracking-wider px-3 mb-3 uppercase">
                                {section}
                            </p>
                            <div className="space-y-1">
                                {items.map(({ key, icon: Icon, label }) => {
                                    const active = isActiveKey(key);
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleNavClick(key)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${active
                                                    ? "bg-accent text-primary"
                                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                                }`}
                                        >
                                            {active && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-md" />
                                            )}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${active ? "bg-white shadow-sm text-primary" : "bg-gray-100/50 text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100"
                                                }`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className={`text-[13px] ${active ? "font-bold" : "font-medium"}`}>
                                                {label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* ── MAIN AREA ───────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-screen lg:ml-[260px]">

                {/* ── TOP NAV E CABEÇALHO COMPACTO ───────────────────────────── */}
                <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 transition-all shadow-sm">
                    {/* Switcher Tabs - Pill Style */}
                    <div className="flex justify-center pt-4 pb-2 px-6">
                        <div className="flex p-1 bg-gray-100 rounded-full shadow-inner max-w-[600px] w-full">
                            <button
                                onClick={() => onChangeModule("lista-telefonica")}
                                className={`flex-1 flex flex-row items-center justify-center gap-2 py-2 text-[14px] font-medium transition-all duration-300 rounded-full h-[38px] ${activeModule === "lista-telefonica"
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-gray-200/50"
                                    }`}
                            >
                                <Phone className={`w-4 h-4 ${activeModule === "lista-telefonica" ? "text-primary" : "text-muted-foreground"}`} />
                                Lista Telefônica
                            </button>
                            <button
                                onClick={() => onChangeModule("gestao-predios")}
                                className={`flex-1 flex flex-row items-center justify-center gap-2 py-2 text-[14px] font-medium transition-all duration-300 rounded-full h-[38px] ${activeModule === "gestao-predios"
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-gray-200/50"
                                    }`}
                            >
                                <Building2 className={`w-4 h-4 ${activeModule === "gestao-predios" ? "text-primary" : "text-muted-foreground"}`} />
                                Gestão de Prédios
                            </button>
                        </div>
                    </div>

                    {/* TopBar principal condensada */}
                    <header className="flex items-center gap-4 px-6 py-[14px]">
                        <button className="lg:hidden p-2 rounded-xl bg-white border" onClick={() => setSidebarOpen(true)}>
                            <Menu className="w-5 h-5 text-gray-600" />
                        </button>

                        <div className="flex-1 flex flex-col justify-center">
                            <h1 className="text-[22px] font-bold tracking-tight text-gray-900 leading-none mb-1">
                                Sistema de Gestão Integrado
                            </h1>
                            <div className="flex items-center gap-1.5 text-[13px] text-gray-500 font-medium">
                                <span>{currentTitle}</span>
                            </div>
                        </div>

                        <div className="relative hidden sm:flex items-center">
                            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="pl-9 pr-4 py-2 text-[13px] rounded-full outline-none w-48 focus:w-64 transition-all bg-gray-50 border border-gray-200 text-gray-800 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div className="flex items-center gap-2 lg:gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-[13px] font-semibold bg-primary hover:bg-secondary transition-all shadow-md shadow-primary/20 active:scale-95">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Novo</span>
                            </button>

                            <button className="w-[38px] h-[38px] rounded-full flex items-center justify-center relative bg-white border hover:bg-gray-50 transition-colors">
                                <Bell className="w-4 h-4 text-gray-500" />
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-destructive border-[2px] border-white" />
                            </button>

                            <button onClick={handleLogout} className="w-[38px] h-[38px] rounded-full flex items-center justify-center bg-white border hover:bg-gray-50 transition-colors" title="Sair do SGI">
                                <LogOut className="w-4 h-4 text-gray-500" />
                            </button>

                            <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center font-bold bg-primary/10 text-primary" style={{ fontSize: 13 }}>
                                {admin?.nome?.[0]?.toUpperCase() ?? "A"}
                            </div>
                        </div>
                    </header>
                </div>

                {/* ── CONTENT ─────────────────────────────────────────────────── */}
                <main className="flex-1 px-6 pb-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
