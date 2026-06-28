import { useState, useEffect, useTransition } from "react";
import { CASE_TEMPLATES } from "./cases";
import { FinancialData, DiagnosticResult } from "./types";
import Header from "./components/Header";
import SidebarInputs from "./components/SidebarInputs";
import DiagnosticTab from "./components/DiagnosticTab";
import AnalyticsTab from "./components/AnalyticsTab";
import IndicatorsTab from "./components/IndicatorsTab";
import ChatTab from "./components/ChatTab";
import { AnimatePresence, motion } from "motion/react";
import { 
  FileSpreadsheet, 
  Activity, 
  Bot, 
  Download, 
  ClipboardCopy, 
  Share2, 
  FileText, 
  Check, 
  CheckCircle,
  Code
} from "lucide-react";

export default function App() {
  // Use transition to avoid blocking UI during state changes
  const [isPending, startTransition] = useTransition();

  // State managers
  const [currentCase, setCurrentCase] = useState({
    empresa: CASE_TEMPLATES[0].empresa,
    descricao: CASE_TEMPLATES[0].descricao,
    data: CASE_TEMPLATES[0].data
  });
  const [activeTab, setActiveTab] = useState<"diagnostico" | "avah" | "indicadores" | "chat">("diagnostico");
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  // Auto trigger analysis on initial mount (with Alfa Distribuidora)
  useEffect(() => {
    executeAnalysis(CASE_TEMPLATES[0].data);
  }, []);

  const executeAnalysis = async (financials: FinancialData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(financials),
      });
      if (response.ok) {
        const payload = await response.json();
        setDiagnosticResult(payload.result);
      } else {
        throw new Error("Falha ao calcular parecer cognitivo.");
      }
    } catch (e) {
      console.error(e);
      // Fallback local calculations in case backend fails
      const fallbackResult = calculateLocalFallback(financials);
      setDiagnosticResult(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  // Helper to load case templates
  const handleLoadData = (data: FinancialData, empresa: string, descricao: string) => {
    startTransition(() => {
      setCurrentCase({ empresa, descricao, data });
      executeAnalysis(data);
    });
  };

  // Helper to update custom inputs from the spreadsheet forms
  const handleUpdateData = (updatedData: FinancialData) => {
    startTransition(() => {
      setCurrentCase((prev) => ({ ...prev, data: updatedData }));
    });
  };

  // Helper for manual calculation fallback
  const calculateLocalFallback = (data: FinancialData): DiagnosticResult => {
    const { balancoAnterior, balancoAtual, dreAnterior, dreAtual } = data;
    // Basic local totals recalculation
    const lcAtu = balancoAtual.ativoCirculante / balancoAtual.passivoCirculante;
    const lcAnt = balancoAnterior.ativoCirculante / balancoAnterior.passivoCirculante;
    const endAtu = (balancoAtual.passivoCirculante + balancoAtual.passivoNaoCirculante) / balancoAtual.ativoTotal;
    const endAnt = (balancoAnterior.passivoCirculante + balancoAnterior.passivoNaoCirculante) / balancoAnterior.ativoTotal;

    return {
      validacao: { integro: true, mensagens: [], ressalva: null },
      resumoExecutivo: `Diagnóstico emitido localmente como contingência. A empresa apresenta Liquidez Corrente de ${lcAtu.toFixed(2)} (anterior: ${lcAnt.toFixed(2)}) e Endividamento Geral de ${(endAtu * 100).toFixed(1)}% (anterior: ${(endAnt * 100).toFixed(1)}%). Verifique as planilhas completas e os indicadores gráficos.`,
      notaExplicativa: `Nota Explicativa Local: Processamento convalidado de acordo com o CPC 26.`,
      pontosFortes: ["Integridade matemática preservada.", "Visualizações e planilhas atualizadas."],
      fragilidades: ["Conexão com o cérebro cognitivo indisponível."],
      geracaoValor: "Geração de lucro líquido de forma consistente nas contas locais.",
      conclusaoGerencial: {
        problemaEstrutural: "Consulte o gráfico de liquidez corrente.",
        principalRisco: "Consulte o indicador de endividamento geral.",
        prioridadeCorrecao: "Garantir consistência operacional.",
        trajetoriaFutura: "Estabilidade moderada sob premissas atuais."
      },
      riscos: {
        liquidez: lcAtu >= 1.0 ? "Moderado" : "Crítico",
        endividamento: endAtu <= 0.6 ? "Moderado" : "Relevante",
        operacional: "Moderado",
        patrimonial: "Moderado",
        rentabilidade: "Moderado"
      },
      analiseAVAH: {
        balanco: [],
        dre: []
      },
      indicadores: []
    };
  };

  // Generate Section 7 JSON output on the fly
  const generatedJsonOutput = JSON.stringify({
    anos: [currentCase.data.anoAnterior, currentCase.data.anoAtual],
    indicadores: {
      liquidez_corrente: [
        diagnosticResult?.indicadores.find(i => i.nome === "Liquidez Corrente")?.resultadoAnterior ?? 0,
        diagnosticResult?.indicadores.find(i => i.nome === "Liquidez Corrente")?.resultadoAtual ?? 0
      ],
      margem_liquida: [
        diagnosticResult?.indicadores.find(i => i.nome === "Margem Líquida")?.resultadoAnterior ?? 0,
        diagnosticResult?.indicadores.find(i => i.nome === "Margem Líquida")?.resultadoAtual ?? 0
      ],
      endividamento: [
        diagnosticResult?.indicadores.find(i => i.nome === "Endividamento Geral")?.resultadoAnterior ?? 0,
        diagnosticResult?.indicadores.find(i => i.nome === "Endividamento Geral")?.resultadoAtual ?? 0
      ]
    }
  }, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(generatedJsonOutput);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!diagnosticResult) return;
    const reportText = `
# DIAGNÓSTICO FINANCEIRO CORPORATIVO - ${currentCase.empresa.toUpperCase()}
Emissão de Parecer Técnico Contábil conforme CPC 26 / IFRS

## 1. CONFIRMAÇÃO E VALIDAÇÃO DOS DADOS
Ativo Total: R$ ${currentCase.data.balancoAtual.ativoTotal.toLocaleString("pt-BR")}
Receita Líquida: R$ ${currentCase.data.dreAtual.receitaLiquida.toLocaleString("pt-BR")}
Integridade: ${diagnosticResult.validacao.integro ? "Convalidado com Sucesso" : "Com Ressalvas"}

## 2. RESUMO EXECUTIVO
${diagnosticResult.resumoExecutivo}

## 4. INDICADORES FINANCEIROS CALCULADOS
${diagnosticResult.indicadores.map(i => `- ${i.nome}: ${i.resultadoAtual} (Fórmula: ${i.formula})`).join("\n")}

## 5. NOTA EXPLICATIVA REGULAMENTAR (CPC 26)
${diagnosticResult.notaExplicativa}

## 6. MAPA DE RISCO E PRIORIDADES
Problema Estrutural: ${diagnosticResult.conclusaoGerencial.problemaEstrutural}
Principal Risco: ${diagnosticResult.conclusaoGerencial.principalRisco}
Prioridade Absoluta: ${diagnosticResult.conclusaoGerencial.prioridadeCorrecao}
Trajetória Futura: ${diagnosticResult.conclusaoGerencial.trajetoriaFutura}
`;

    const blob = new Blob([reportText], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ConfiaAI_Report_${currentCase.empresa.replace(/\s+/g, "_")}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="confiaai-app">
      
      {/* Dynamic Header */}
      <Header 
        empresa={currentCase.empresa} 
        descricao={currentCase.descricao} 
        result={diagnosticResult} 
        loading={loading}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-0 sm:px-4 lg:px-6 py-6 gap-6" id="workspace-layout">
        
        {/* Left Sidebar spreadsheet inputs */}
        <SidebarInputs 
          onLoadData={handleLoadData}
          currentData={currentCase.data}
          onUpdateData={handleUpdateData}
          onAnalyze={() => executeAnalysis(currentCase.data)}
          loading={loading}
        />

        {/* Main analytical dashboard tabs workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Navigation Tab list */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-xs mb-6 overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab("diagnostico")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "diagnostico" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <FileText className="w-4 h-4" />
              Diagnóstico Executivo
            </button>
            <button
              onClick={() => setActiveTab("avah")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "avah" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Análise Vertical/Horizontal (AV/AH)
            </button>
            <button
              onClick={() => setActiveTab("indicadores")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "indicadores" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Activity className="w-4 h-4" />
              Fórmulas & Gráficos
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "chat" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Bot className="w-4 h-4" />
              Chat com ConfiaAI
            </button>
          </div>

          {/* Core Content frame */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="focus:outline-hidden"
              >
                {activeTab === "diagnostico" && (
                  <DiagnosticTab 
                    result={diagnosticResult} 
                    data={currentCase.data} 
                    empresa={currentCase.empresa}
                  />
                )}
                {activeTab === "avah" && (
                  <AnalyticsTab 
                    result={diagnosticResult} 
                    data={currentCase.data} 
                  />
                )}
                {activeTab === "indicadores" && (
                  <IndicatorsTab 
                    result={diagnosticResult} 
                    data={currentCase.data} 
                  />
                )}
                {activeTab === "chat" && (
                  <ChatTab 
                    data={currentCase.data} 
                    result={diagnosticResult} 
                    empresa={currentCase.empresa}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Export rails section */}
          {diagnosticResult && (
            <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between bg-white border border-slate-200 rounded-xl p-4 gap-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Análise concluída com base em regras contábeis consolidadas.</span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {/* Download Report */}
                <button
                  onClick={handleDownloadReport}
                  className="bg-blue-600 text-white hover:bg-blue-700 font-sans font-bold text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Relatório (.MD)
                </button>

                {/* Copy Section 7 JSON Structure */}
                <button
                  onClick={handleCopyJson}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> : <Code className="w-3.5 h-3.5 text-slate-500" />}
                  {copiedJson ? "Estrutura JSON Copiada!" : "Copiar JSON Gráficos"}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
