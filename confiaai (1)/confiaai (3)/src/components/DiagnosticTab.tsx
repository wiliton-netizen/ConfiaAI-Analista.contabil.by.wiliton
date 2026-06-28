import { useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Copy, 
  Check, 
  ShieldAlert, 
  TrendingUp, 
  ArrowUpRight, 
  Activity, 
  BookOpen,
  Zap,
  HelpCircle,
  FileText
} from "lucide-react";
import { DiagnosticResult, FinancialData } from "../types";

interface DiagnosticTabProps {
  result: DiagnosticResult | null;
  data: FinancialData;
  empresa: string;
}

export default function DiagnosticTab({ result, data, empresa }: DiagnosticTabProps) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 max-w-2xl mx-auto my-12 shadow-xs">
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-900 font-display mb-2">Aguardando Processamento</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Preencha os dados do Balanço Patrimonial e DRE no menu lateral ou escolha um caso pré-definido e clique em <span className="font-semibold text-emerald-600">"Processar Diagnóstico"</span> para acionar o analista de alta performance ConfiaAI.
        </p>
      </div>
    );
  }

  const { validacao, resumoExecutivo, notaExplicativa, pontosFortes, fragilidades, geracaoValor, conclusaoGerencial, riscos } = result;

  const handleCopyNote = () => {
    navigator.clipboard.writeText(notaExplicativa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Color code for risks
  const getRiskBadge = (level: string) => {
    switch (level) {
      case "Crítico":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "Relevante":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Moderado":
        return "bg-sky-100 text-sky-800 border-sky-200";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  return (
    <div className="space-y-6" id="diagnostic-tab-workspace">
      
      {/* SECTION 1: CONFIRMAÇÃO E VALIDAÇÃO DOS DADOS */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs" id="sec-validation">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          1. Confirmação e Validação dos Dados
        </h3>
        
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 font-display">
              Balanço e DRE de {data.anoAnterior} e {data.anoAtual} recebidos com sucesso.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Leitura de Ativo Total de <strong className="text-slate-800">R$ {data.balancoAtual.ativoTotal.toLocaleString("pt-BR")}</strong> e Receita Líquida de <strong className="text-slate-800">R$ {data.dreAtual.receitaLiquida.toLocaleString("pt-BR")}</strong>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <span className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold border flex items-center gap-1.5 ${validacao.integro ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
              {validacao.integro ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
              {validacao.integro ? "ATIVO = PASSIVO + PL" : "DESEQUILÍBRIO CONTÁBIL"}
            </span>
          </div>
        </div>

        {validacao.mensagens.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Alertas Contábeis de Integridade (CPC 26)
            </h4>
            <ul className="list-disc pl-5 text-xs text-amber-900 space-y-1 font-mono">
              {validacao.mensagens.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {validacao.ressalva && (
          <div className="mt-3 p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-800">RESSALVA TÉCNICA E RESTRIÇÃO DE ESCOPO</h4>
                <p className="text-xs text-rose-950 mt-1 font-mono leading-relaxed">{validacao.ressalva}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: RESUMO EXECUTIVO */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs relative overflow-hidden" id="sec-summary">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full blur-3xl -z-10"></div>
        
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          2. Resumo Executivo
        </h3>

        <div className="prose prose-slate max-w-none text-slate-800">
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans font-medium text-slate-800 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            {resumoExecutivo}
          </p>
        </div>
      </section>

      {/* SECTION 5: DIAGNÓSTICO E MINUTA DE NOTA EXPLICATIVA */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="sec-strength-note">
        
        {/* Points of Strength and Fragilities Checklist */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              5. Pontos Fortes e Fragilidades
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 font-mono">Pontos Fortes</h4>
                <ul className="space-y-2">
                  {pontosFortes.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 bg-emerald-50/40 p-2.5 rounded-lg text-xs font-semibold text-emerald-950 border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 font-mono">Fragilidades e Gargalos</h4>
                <ul className="space-y-2">
                  {fragilidades.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 bg-rose-50/40 p-2.5 rounded-lg text-xs font-semibold text-rose-950 border border-rose-100">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Geração de Valor Econômico (EVA)</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold italic bg-slate-50 p-3 rounded-lg border border-slate-100">
              {geracaoValor}
            </p>
          </div>
        </div>

        {/* Minuta de Nota Explicativa CPC 26 */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Nota Explicativa (Norma CPC 26 / IAS 1)
              </h3>
              <button
                onClick={handleCopyNote}
                className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 font-mono font-bold bg-slate-100 px-2 py-1 rounded-md transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Minuta formal gerada para anexação às Demonstrações Contábeis encerradas em {data.anoAtual}, focada no fato contábil crítico de maior volatilidade identificado:
            </p>

            <div className="bg-slate-950 text-slate-100 p-4 rounded-lg font-mono text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap border border-slate-800 select-all">
              {notaExplicativa}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-mono mt-4">
            * Elaborado de acordo com as diretrizes do Comitê de Pronunciamentos Contábeis (CPC).
          </p>
        </div>

      </section>

      {/* SECTION 6: MAPA DE RISCOS E CONCLUSÃO GERENCIAL */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs" id="sec-risk-map">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-rose-500" />
          6. Mapa de Riscos Corporativos
        </h3>

        {/* Risk Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {Object.entries(riscos).map(([key, value]) => (
            <div key={key} className="border border-slate-100 bg-slate-50/50 rounded-lg p-3 text-center flex flex-col items-center justify-center gap-1.5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">{key}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRiskBadge(value)}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Executive Direct Answers */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            Conclusão e Direcionamento Gerencial
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white p-3 rounded-md border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[9px]">Qual o principal problema estrutural?</span>
              <p className="text-slate-950 font-bold font-display">{conclusaoGerencial.problemaEstrutural}</p>
            </div>

            <div className="bg-white p-3 rounded-md border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[9px]">Qual o principal risco de mercado/crédito?</span>
              <p className="text-slate-950 font-bold font-display">{conclusaoGerencial.principalRisco}</p>
            </div>

            <div className="bg-white p-3 rounded-md border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[9px]">Qual a prioridade absoluta de correção?</span>
              <p className="text-emerald-700 font-bold font-display">{conclusaoGerencial.prioridadeCorrecao}</p>
            </div>

            <div className="bg-white p-3 rounded-md border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[9px]">Qual a possível trajetória futura da empresa?</span>
              <p className="text-slate-950 font-bold font-display">{conclusaoGerencial.trajetoriaFutura}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
