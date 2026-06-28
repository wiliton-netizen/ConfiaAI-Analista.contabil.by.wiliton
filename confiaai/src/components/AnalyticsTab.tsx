import { useState } from "react";
import { 
  Table, 
  Eye, 
  ArrowUp, 
  ArrowDown, 
  ToggleLeft, 
  ToggleRight, 
  TrendingUp, 
  Percent, 
  CheckCircle, 
  TrendingDown,
  Info
} from "lucide-react";
import { DiagnosticResult, FinancialData } from "../types";

interface AnalyticsTabProps {
  result: DiagnosticResult | null;
  data: FinancialData;
}

export default function AnalyticsTab({ result, data }: AnalyticsTabProps) {
  const [highlightVariations, setHighlightVariations] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"balanco" | "dre">("balanco");

  if (!result) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 max-w-2xl mx-auto my-12 shadow-xs">
        <Percent className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-900 font-display mb-2">Processamento de Variações Pendente</h3>
        <p className="text-sm text-slate-500">
          Por favor, processe o cenário contábil no painel lateral para calcular as matrizes de Análise Horizontal (AH) e Análise Vertical (AV) completas.
        </p>
      </div>
    );
  }

  const { balanco, dre } = result.analiseAVAH;

  // Format money helper
  const fmtCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  };

  // Format percentage helper
  const fmtPct = (val: number) => {
    return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`;
  };

  // Row highlight logic based on account type and horizontal variation
  const getHorizontalVarStyle = (conta: string, val: number) => {
    if (!highlightVariations) return "text-slate-900";
    if (val === 0) return "text-slate-500";

    const labelLower = conta.toLowerCase();
    const isAsset = labelLower.includes("ativo") || labelLower.includes("disponível") || labelLower.includes("clientes") || labelLower.includes("receita") || labelLower.includes("lucro");
    const isLiabilityOrCost = labelLower.includes("passivo") || labelLower.includes("fornecedores") || labelLower.includes("empréstimos") || labelLower.includes("obrigações") || labelLower.includes("custos") || labelLower.includes("despesas") || labelLower.includes("prejuízos") || labelLower.includes("impostos");

    if (isAsset) {
      return val > 0 ? "text-emerald-600 font-semibold bg-emerald-50/50 px-1 py-0.5 rounded-sm" : "text-rose-600 font-semibold bg-rose-50/50 px-1 py-0.5 rounded-sm";
    }
    if (isLiabilityOrCost) {
      // For liabilities/costs, an increase is bad (rose) and decrease is good (emerald)
      return val > 0 ? "text-rose-600 font-semibold bg-rose-50/50 px-1 py-0.5 rounded-sm" : "text-emerald-600 font-semibold bg-emerald-50/50 px-1 py-0.5 rounded-sm";
    }
    return "text-slate-900";
  };

  // Dynamic interpretation generator
  const getCommentary = () => {
    const isBalanco = activeSubTab === "balanco";
    if (isBalanco) {
      // Find critical changes in balance sheet
      const cashChange = balanco.find(b => b.conta.includes("Disponível"))?.varAH ?? 0;
      const loanChangeCP = balanco.find(b => b.conta.includes("Empréstimos e Financiamentos CP"))?.varAH ?? 0;
      const equityChange = balanco.find(b => b.conta.includes("Patrimônio Líquido"))?.varAH ?? 0;

      return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-500" />
            Variações Críticas de Balanço ({data.anoAnterior} → {data.anoAtual})
          </h4>
          <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
            <li>
              O <strong>Disponível (Caixa e Equivalentes)</strong> variou em <span className={cashChange >= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>{fmtPct(cashChange)}</span>, refletindo a dinâmica de caixa operacional e captações.
            </li>
            <li>
              Os <strong>Empréstimos e Financiamentos de Curto Prazo</strong> variaram em <span className={loanChangeCP <= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>{fmtPct(loanChangeCP)}</span>. Elevações elevadas pressionam severamente os índices de liquidez de curtíssimo prazo.
            </li>
            <li>
              O <strong>Patrimônio Líquido</strong> encerrou o período com variação de <span className={equityChange >= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>{fmtPct(equityChange)}</span>, impactado diretamente pela geração de lucros ou absorção de prejuízos operacionais.
            </li>
          </ul>
        </div>
      );
    } else {
      // Find critical changes in DRE
      const salesChange = dre.find(d => d.conta.includes("RECEITA LÍQUIDA"))?.varAH ?? 0;
      const costsChange = dre.find(d => d.conta.includes("Custos"))?.varAH ?? 0;
      const profitChange = dre.find(d => d.conta.includes("LUCRO LÍQUIDO"))?.varAH ?? 0;

      return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-500" />
            Variações Críticas de Margem e Resultados ({data.anoAnterior} → {data.anoAtual})
          </h4>
          <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
            <li>
              A <strong>Receita Líquida</strong> apresentou variação horizontal de <span className={salesChange >= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>{fmtPct(salesChange)}</span>, sinalizando o ritmo de faturamento e vendas líquidas.
            </li>
            <li>
              Os <strong>Custos de Produção/Serviços (CPV)</strong> variaram em <span className={costsChange <= salesChange ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>{fmtPct(costsChange)}</span>. Custos crescendo acima do faturamento indicam perda material de margem de contribuição.
            </li>
            <li>
              O <strong>Resultado Líquido (Lucro/Prejuízo)</strong> encerrou com oscilação de <span className={profitChange >= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>{fmtPct(profitChange)}</span>, determinando a atratividade do negócio.
            </li>
          </ul>
        </div>
      );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6" id="analytics-tab-workspace">
      
      {/* Tab controls & toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        
        {/* Toggle Balanço / DRE */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveSubTab("balanco")}
            className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${activeSubTab === "balanco" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            Balanço Patrimonial
          </button>
          <button
            onClick={() => setActiveSubTab("dre")}
            className={`px-4 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${activeSubTab === "dre" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            DRE Verticalizada
          </button>
        </div>

        {/* Toggle color highlighter */}
        <button
          onClick={() => setHighlightVariations(!highlightVariations)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 font-semibold font-mono border border-slate-200 px-3 py-1.5 rounded-lg bg-slate-50/50 cursor-pointer"
        >
          {highlightVariations ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
          <span>Destacar Variações Críticas</span>
        </button>

      </div>

      {/* Structured data table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse text-sm select-none">
          <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 font-semibold">Conta / Lançamento Contábil</th>
              <th className="px-5 py-3 text-right font-semibold">{data.anoAnterior}</th>
              <th className="px-5 py-3 text-right font-semibold">AV % ({data.anoAnterior})</th>
              <th className="px-5 py-3 text-right font-semibold">{data.anoAtual}</th>
              <th className="px-5 py-3 text-right font-semibold">AV % ({data.anoAtual})</th>
              <th className="px-5 py-3 text-right font-semibold">AH % (Variação)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {activeSubTab === "balanco" ? (
              balanco.map((row, idx) => {
                const isMainTotal = row.conta === "ATIVO TOTAL" || row.conta === "PASSIVO TOTAL + PL";
                const isHeader = isMainTotal || row.conta === "Ativo Circulante" || row.conta === "Ativo Não Circulante" || row.conta === "Passivo Circulante" || row.conta === "Passivo Não Circulante" || row.conta === "Patrimônio Líquido";
                const isSubItem = row.conta.startsWith(" - ");

                return (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-50/50 transition-colors ${
                      isMainTotal 
                        ? "bg-blue-50/30 font-bold text-slate-900" 
                        : isHeader 
                          ? "bg-slate-50/50 font-semibold text-slate-800" 
                          : "text-slate-600"
                    }`}
                  >
                    <td className={`px-5 py-2.5 font-sans ${isSubItem ? "pl-9 text-slate-500 italic" : ""}`}>
                      {row.conta}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(row.anteriorValor)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs text-slate-400">
                      {row.anteriorAV.toFixed(1)}%
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(row.atualValor)}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-mono text-xs font-semibold ${isHeader ? "text-slate-800" : "text-slate-500"}`}>
                      {row.atualAV.toFixed(1)}%
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs font-bold">
                      <span className={getHorizontalVarStyle(row.conta, row.varAH)}>
                        {fmtPct(row.varAH)}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              dre.map((row, idx) => {
                const isMainTotal = row.conta === "RECEITA LÍQUIDA" || row.conta === "LUCRO LÍQUIDO";
                const isHeader = isMainTotal || row.conta === "LUCRO BRUTO" || row.conta === "LUCRO ANTES DO JUR. IMP. (EBIT)";
                
                return (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-50/50 transition-colors ${
                      isMainTotal 
                        ? "bg-blue-50/30 font-bold text-slate-900" 
                        : isHeader 
                          ? "bg-slate-50/50 font-semibold text-slate-800" 
                          : "text-slate-600"
                    }`}
                  >
                    <td className="px-5 py-2.5 font-sans">
                      {row.conta}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(row.anteriorValor)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs text-slate-400">
                      {row.anteriorAV.toFixed(1)}%
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(row.atualValor)}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-mono text-xs font-semibold ${isHeader ? "text-slate-800" : "text-slate-500"}`}>
                      {row.atualAV.toFixed(1)}%
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs font-bold">
                      <span className={getHorizontalVarStyle(row.conta, row.varAH)}>
                        {fmtPct(row.varAH)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Explanation Commentary Box */}
      {getCommentary()}

      {/* Note about rules */}
      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
        <span>Normas Brasileiras de Contabilidade (NBC / CPC) e Fórmulas Internacionais de AH / AV aplicadas com exatidão decimal.</span>
      </div>

    </div>
  );
}
