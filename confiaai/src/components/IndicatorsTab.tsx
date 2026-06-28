import { useState, useMemo } from "react";
import { 
  Layers, 
  LineChart as LineChartIcon, 
  TrendingUp, 
  Flame,
} from "lucide-react";
import { DiagnosticResult, FinancialData } from "../types";
import D3LineChart from "./D3LineChart";

interface IndicatorsTabProps {
  result: DiagnosticResult | null;
  data: FinancialData;
}

export default function IndicatorsTab({ result, data }: IndicatorsTabProps) {
  const [activeGroup, setActiveGroup] = useState<"Todos" | "Liquidez" | "Estrutura" | "Rentabilidade">("Todos");

  if (!result) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 max-w-2xl mx-auto my-12 shadow-xs">
        <LineChartIcon className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-900 font-display mb-2">Processamento de Indicadores Pendente</h3>
        <p className="text-sm text-slate-500">
          Carregue um cenário contábil e processe o diagnóstico para gerar as fórmulas de substituição e os gráficos analíticos.
        </p>
      </div>
    );
  }

  const { indicadores } = result;

  // Filter indicators
  const filteredIndicadores = useMemo(() => {
    if (activeGroup === "Todos") return indicadores;
    return indicadores.filter((ind) => ind.grupo === activeGroup);
  }, [indicadores, activeGroup]);

  // Chart Data Formatting for D3
  const chartData = useMemo(() => {
    // Collect indicators of interest
    const lcAnt = indicadores.find(i => i.nome === "Liquidez Corrente")?.resultadoAnterior ?? 0;
    const lcAtu = indicadores.find(i => i.nome === "Liquidez Corrente")?.resultadoAtual ?? 0;

    const lsAnt = indicadores.find(i => i.nome === "Liquidez Seca")?.resultadoAnterior ?? 0;
    const lsAtu = indicadores.find(i => i.nome === "Liquidez Seca")?.resultadoAtual ?? 0;

    const endAnt = indicadores.find(i => i.nome === "Endividamento Geral")?.resultadoAnterior ?? 0;
    const endAtu = indicadores.find(i => i.nome === "Endividamento Geral")?.resultadoAtual ?? 0;

    const mbAnt = indicadores.find(i => i.nome === "Margem Bruta")?.resultadoAnterior ?? 0;
    const mbAtu = indicadores.find(i => i.nome === "Margem Bruta")?.resultadoAtual ?? 0;

    const mlAnt = indicadores.find(i => i.nome === "Margem Líquida")?.resultadoAnterior ?? 0;
    const mlAtu = indicadores.find(i => i.nome === "Margem Líquida")?.resultadoAtual ?? 0;

    return [
      {
        name: data.anoAnterior,
        liquidez_corrente: lcAnt,
        liquidez_seca: lsAnt,
        endividamento: endAnt,
        margem_bruta: mbAnt,
        margem_liquida: mlAnt,
      },
      {
        name: data.anoAtual,
        liquidez_corrente: lcAtu,
        liquidez_seca: lsAtu,
        endividamento: endAtu,
        margem_bruta: mbAtu,
        margem_liquida: mlAtu,
      }
    ];
  }, [indicadores, data]);

  return (
    <div className="space-y-8" id="indicators-tab-workspace">
      
      {/* 1. VISUAL D3 CHARTS SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="analytics-charts">
        
        {/* Chart 1: Liquidez */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              Evolução de Liquidez (D3)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Corrente vs Seca (Ideal &gt;= 1.0)</span>
          </div>

          <div className="h-56 w-full flex-1">
            <D3LineChart
              data={chartData}
              series={[
                { key: "liquidez_corrente", label: "Liq. Corrente", color: "#10b981" },
                { key: "liquidez_seca", label: "Liq. Seca", color: "#3b82f6" }
              ]}
              referenceValue={1.0}
              referenceLabel="Ideal"
            />
          </div>
        </div>

        {/* Chart 2: Margens e Rentabilidade */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              Eficiência e Margens (D3)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Margem Bruta % vs Margem Líquida %</span>
          </div>

          <div className="h-56 w-full flex-1">
            <D3LineChart
              data={chartData}
              series={[
                { key: "margem_bruta", label: "Margem Bruta", color: "#10b981" },
                { key: "margem_liquida", label: "Margem Líquida", color: "#ef4444" }
              ]}
              unit="%"
            />
          </div>
        </div>

        {/* Chart 3: Alavancagem e Endividamento */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              Endividamento Geral (D3)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Passivo Total / Ativo Total (Ideal &lt;= 50%)</span>
          </div>

          <div className="h-56 w-full flex-1">
            <D3LineChart
              data={chartData}
              series={[
                { key: "endividamento", label: "Endividamento Geral", color: "#64748b" }
              ]}
              unit="%"
              referenceValue={50}
              referenceLabel="Alvo Máx"
            />
          </div>
        </div>

      </section>

      {/* 2. SPECIFIC INDICATORS GRID & FORMULA TABLE */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs" id="sec-indicators-table">
        
        {/* Navigation Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Fórmulas e Detalhamento de Indicadores
            </h3>
            <p className="text-xs text-slate-400 font-mono">Fórmula | Substituição Numérica | Resultado | Parecer Técnico</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg self-start">
            {(["Todos", "Liquidez", "Estrutura", "Rentabilidade"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${activeGroup === g ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Indicadores */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-left border-collapse text-sm select-none">
            <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Indicador</th>
                <th className="px-5 py-3 font-semibold">Fórmula</th>
                <th className="px-5 py-3 text-right font-semibold">Substituição ({data.anoAtual})</th>
                <th className="px-5 py-3 text-right font-semibold">{data.anoAnterior}</th>
                <th className="px-5 py-3 text-right font-semibold">{data.anoAtual}</th>
                <th className="px-5 py-3 font-semibold pl-6">Interpretação e Parecer Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredIndicadores.map((ind, idx) => {
                const isPercent = ind.grupo === "Estrutura" || ind.grupo === "Rentabilidade";
                const suffix = isPercent ? "%" : "";
                
                // Endividamento / Rentabilidade colors
                const valAtu = ind.resultadoAtual;
                const valAnt = ind.resultadoAnterior;
                
                const isBad = (ind.grupo === "Liquidez" && valAtu < 1.0) || 
                              (ind.nome.includes("Endividamento") && valAtu > 65.0) ||
                              (ind.grupo === "Rentabilidade" && valAtu < 0);

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-slate-600">
                    <td className="px-5 py-3.5 font-sans font-bold text-slate-900">
                      <div className="flex flex-col">
                        <span>{ind.nome}</span>
                        <span className="text-[9px] text-slate-400 font-mono font-semibold uppercase">{ind.grupo}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs font-semibold">{ind.formula}</td>
                    <td className="px-5 py-3.5 text-right text-slate-600 font-mono text-xs font-semibold max-w-xs truncate">{ind.substituicaoAtual}</td>
                    <td className="px-5 py-3.5 text-right text-slate-400 font-mono text-xs font-medium">
                      {valAnt.toLocaleString("pt-BR")}{suffix}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-bold font-mono text-sm ${isBad ? "text-rose-600" : "text-slate-900"}`}>
                      {valAtu.toLocaleString("pt-BR")}{suffix}
                    </td>
                    <td className="px-5 py-3.5 pl-6 font-sans text-slate-600 leading-relaxed max-w-sm text-xs">
                      {ind.interpretacao}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </section>

    </div>
  );
}
