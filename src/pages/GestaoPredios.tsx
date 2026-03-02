import { Building2, Hammer } from "lucide-react";

export default function GestaoPredios() {
    return (
        <div className="px-6 py-10 flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
            <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(0,122,255,0.10)" }}
            >
                <Building2 className="h-10 w-10 text-primary" />
            </div>
            <div>
                <h2 className="text-[24px] font-semibold tracking-tight text-foreground">
                    Gestão de Prédios
                </h2>
                <p className="text-[14px] text-muted-foreground mt-2 max-w-sm">
                    Módulo em construção. Em breve você poderá gerenciar seus prédios e territórios aqui.
                </p>
            </div>
            <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium"
                style={{ background: "rgba(255,149,0,0.12)", color: "#7a5000" }}
            >
                <Hammer className="h-4 w-4" />
                Em desenvolvimento
            </div>
        </div>
    );
}
