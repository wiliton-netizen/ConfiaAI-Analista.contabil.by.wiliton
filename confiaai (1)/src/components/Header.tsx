import { ShieldAlert, ShieldCheck } from "lucide-react";
import { DiagnosticResult } from "../types";

interface HeaderProps {
  empresa: string;
  descricao: string;
  result: DiagnosticResult | null;
  loading: boolean;
}

export default function Header({ empresa, descricao, result, loading }: HeaderProps) {
  const isIntegro = result?.validacao?.integro ?? true;
  const numWarnings = result?.validacao?.mensagens?.length ?? 0;

  return (
    <header className="bg-[#0F172A] text-white sticky top-0 z-50 px-6 py-4 border-b border-slate-700 shadow-sm" id="confiaai-header">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand logo & Description */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg text-white">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                ConfiaAI <span className="text-slate-400 font-normal text-sm hidden sm:inline">| Analista Financeiro Sênior</span>
              </h1>
              <span className="bg-slate-800 text-slate-300 text-[10px] font-semibold tracking-wider font-mono px-2 py-0.5 rounded border border-slate-700">
                v4.2
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Padrão: IFRS / CPC 26 Compliance
            </p>
          </div>
        </div>

        {/* Current status banner */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col text-left md:text-right">
            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Empresa sob Diagnóstico</span>
            <span className="text-sm font-semibold text-white">{empresa}</span>
          </div>

          <div className="h-8 w-[1px] bg-slate-700 hidden sm:block"></div>

          {loading ? (
            <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded border border-blue-500/20 text-blue-400 text-xs font-medium font-mono">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>PROCESSANDO DADOS...</span>
            </div>
          ) : !isIntegro ? (
            <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/20 text-amber-400 text-xs font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>RESSALVAS IDENTIFICADAS ({numWarnings})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>DADOS CONVALIDADOS</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
