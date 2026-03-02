import { Building2, Phone } from "lucide-react";

interface SgiLayoutProps {
    activeModule: "lista-telefonica" | "gestao-predios";
    onChangeModule: (mod: "lista-telefonica" | "gestao-predios") => void;
    children: React.ReactNode;
}

export function SgiLayout({ activeModule, onChangeModule, children }: SgiLayoutProps) {
    return (
        <div className="min-h-screen" style={{ background: "#f5f5f7" }}>
            {/* ===== TOP HEADER ===== */}
            <div className="pt-10 pb-2 px-6 max-w-7xl mx-auto">
                <h1
                    className="text-[32px] font-bold tracking-tight text-foreground"
                    style={{ letterSpacing: "-0.5px" }}
                >
                    Sistema de Gestão Integrado
                </h1>
                <p className="text-[14px] text-muted-foreground mt-1">
                    Gerencie suas listas e prédios em uma única plataforma
                </p>
            </div>

            {/* ===== MODULE TABS (pill selector) ===== */}
            <div className="px-6 pt-4 pb-2 max-w-7xl mx-auto">
                <div
                    className="inline-flex rounded-xl p-1 gap-1"
                    style={{ background: "rgba(0,0,0,0.06)" }}
                >
                    <button
                        id="tab-lista-telefonica"
                        onClick={() => onChangeModule("lista-telefonica")}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${activeModule === "lista-telefonica"
                                ? "bg-white text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Phone className="h-4 w-4" />
                        Lista Telefônica
                    </button>
                    <button
                        id="tab-gestao-predios"
                        onClick={() => onChangeModule("gestao-predios")}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${activeModule === "gestao-predios"
                                ? "bg-white text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Building2 className="h-4 w-4" />
                        Gestão de Prédios
                    </button>
                </div>
            </div>

            {/* ===== MODULE CONTENT ===== */}
            <div className="max-w-7xl mx-auto">{children}</div>
        </div>
    );
}
