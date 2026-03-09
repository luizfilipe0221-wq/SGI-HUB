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
                className={`fixed top-0 left-0 h-screen w-[260px] z-50 flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
                style={{ background: "#fff", boxShadow: "4px 0 20px rgba(0,0,0,0.06)", borderRadius: "0 20px 20px 0" }}
            >
                {/* Logo */}
                <div className="px-6 pt-7 pb-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "#FB8C00" }}>
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-[15px] font-800 text-gray-900 leading-tight" style={{ fontWeight: 800 }}>SGI Hub</p>
                        <p className="text-[11px] text-gray-400">Gestão Integrado v2</p>
                    </div>
                    <button className="lg:hidden ml-auto text-gray-400" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-4 mt-1 mb-4">
                    <div className="h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
                </div>

                {/* Nav sections */}
                <nav className="flex-1 overflow-y-auto px-4 space-y-5">
                    {navItems.map(({ section, items }) => (
                        <div key={section}>
                            <p className="text-[10px] font-700 text-gray-400 tracking-widest px-3 mb-2 uppercase"
                                style={{ fontWeight: 700 }}>
                                {section}
                            </p>
                            <div className="space-y-1">
                                {items.map(({ key, icon: Icon, label }) => {
                                    const active = isActiveKey(key);
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleNavClick(key)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
                                            style={active
                                                ? { background: "#1A1A2E" }
                                                : { background: "transparent" }
                                            }
                                        >
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
                                                style={active
                                                    ? { background: "#FB8C00" }
                                                    : { background: "rgba(0,0,0,0.05)" }
                                                }>
                                                <Icon className="w-4 h-4 transition-colors"
                                                    style={{ color: active ? "#fff" : "#8D8D8D" }} />
                                            </div>
                                            <span className="text-[13px] font-600 transition-colors"
                                                style={{ fontWeight: 600, color: active ? "#fff" : "#6B7280" }}>
                                                {label}
                                            </span>
                                            {active && <ChevronRight className="w-4 h-4 ml-auto text-white opacity-60" />}
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

                {/* ── TOPBAR ──────────────────────────────────────────────────── */}
                <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4"
                    style={{ background: "rgba(248,249,250,0.9)", backdropFilter: "blur(12px)" }}>
                    {/* Mobile menu button */}
                    <button className="lg:hidden p-2 rounded-xl" style={{ background: "#fff" }}
                        onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1 text-[13px] flex-1">
                        <span className="text-gray-400">Páginas</span>
                        <span className="text-gray-300 mx-1">/</span>
                        <span className="font-700 text-gray-700" style={{ fontWeight: 700 }}>{currentTitle}</span>
                    </div>

                    {/* Search */}
                    <div className="relative hidden sm:flex items-center">
                        <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Digite aqui..."
                            className="pl-9 pr-4 py-2.5 text-[13px] rounded-xl outline-none w-48 focus:w-64 transition-all"
                            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", color: "#374151" }}
                        />
                    </div>

                    {/* Topbar actions */}
                    <div className="flex items-center gap-2">
                        <button
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-700 shadow-md transition-all hover:opacity-90 active:scale-95"
                            style={{ background: "#FB8C00", fontWeight: 700, boxShadow: "0 4px 15px rgba(251,140,0,0.35)" }}
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Novo</span>
                        </button>
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center relative"
                            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
                            <Bell className="w-4 h-4 text-gray-500" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                                style={{ background: "#FB8C00" }} />
                        </button>
                        <button onClick={handleLogout}
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
                            title="Sair">
                            <LogOut className="w-4 h-4 text-gray-500" />
                        </button>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-700"
                            style={{ background: "#1A1A2E", color: "#FB8C00", fontSize: 13, fontWeight: 800 }}>
                            {admin?.nome?.[0]?.toUpperCase() ?? "A"}
                        </div>
                    </div>
                </header>

                {/* ── MODULE SWITCHER ─────────────────────────────────────────── */}
                <div className="px-6 pt-2 pb-4">
                    <div className="flex rounded-2xl overflow-hidden shadow-sm"
                        style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                        <button
                            onClick={() => onChangeModule("lista-telefonica")}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-[14px] transition-all duration-200"
                            style={activeModule === "lista-telefonica"
                                ? { background: "#1A1A2E", color: "#fff", fontWeight: 700 }
                                : { background: "#fff", color: "#6B7280", fontWeight: 600 }
                            }
                        >
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{ background: activeModule === "lista-telefonica" ? "rgba(251,140,0,0.25)" : "rgba(0,0,0,0.05)" }}>
                                <Phone className="w-3.5 h-3.5"
                                    style={{ color: activeModule === "lista-telefonica" ? "#FB8C00" : "#9CA3AF" }} />
                            </div>
                            Lista Telefônica
                        </button>
                        <div className="w-px" style={{ background: "rgba(0,0,0,0.06)" }} />
                        <button
                            onClick={() => onChangeModule("gestao-predios")}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-[14px] transition-all duration-200"
                            style={activeModule === "gestao-predios"
                                ? { background: "#1A1A2E", color: "#fff", fontWeight: 700 }
                                : { background: "#fff", color: "#6B7280", fontWeight: 600 }
                            }
                        >
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{ background: activeModule === "gestao-predios" ? "rgba(251,140,0,0.25)" : "rgba(0,0,0,0.05)" }}>
                                <Building2 className="w-3.5 h-3.5"
                                    style={{ color: activeModule === "gestao-predios" ? "#FB8C00" : "#9CA3AF" }} />
                            </div>
                            Gestão de Prédios
                        </button>
                    </div>
                </div>

                {/* ── CONTENT ─────────────────────────────────────────────────── */}
                <main className="flex-1 px-6 pb-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
