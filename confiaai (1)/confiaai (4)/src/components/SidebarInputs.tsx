import { useState, startTransition } from "react";
import { CASE_TEMPLATES, CaseTemplate } from "../cases";
import { FinancialData } from "../types";
import { 
  Building2, 
  HelpCircle, 
  RefreshCw, 
  FileText, 
  Upload, 
  TrendingUp, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Check,
  File
} from "lucide-react";

interface SidebarInputsProps {
  onLoadData: (data: FinancialData, empresa: string, descricao: string) => void;
  currentData: FinancialData;
  onUpdateData: (data: FinancialData) => void;
  onAnalyze: () => void;
  loading: boolean;
}

export default function SidebarInputs({
  onLoadData,
  currentData,
  onUpdateData,
  onAnalyze,
  loading,
}: SidebarInputsProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("caso_1");
  const [activeTab, setActiveTab] = useState<"balanco" | "dre" | "json" | "upload">("balanco");
  const [customJsonInput, setCustomJsonInput] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string | null>(null);
  const [showMdPreview, setShowMdPreview] = useState(false);

  // Default templates data
  const defaultTemplateData = {
    empresa: "Nova Empresa S.A.",
    descricao: "Demonstrativos financeiros importados para análise contábil.",
    anoAnterior: "2024",
    anoAtual: "2025",
    balancoAnterior: {
      disponivel: 2000000,
      clientes: 1500000,
      estoques: 1200000,
      outrosAC: 300000,
      realizavelLP: 400000,
      investimentos: 300000,
      imobilizado: 2500000,
      intangivel: 300000,
      fornecedores: 1300000,
      emprestimosCP: 700000,
      obrigacoesFiscais: 400000,
      outrosPC: 200000,
      emprestimosLP: 1500000,
      outrosPNC: 300000,
      capitalSocial: 3000000,
      reservasLucros: 1100000,
      prejuizosAcumulados: 0
    },
    balancoAtual: {
      disponivel: 2800000,
      clientes: 1800000,
      estoques: 1500000,
      outrosAC: 350000,
      realizavelLP: 500000,
      investimentos: 350000,
      imobilizado: 2800000,
      intangivel: 400000,
      fornecedores: 1500000,
      emprestimosCP: 900000,
      obrigacoesFiscais: 450000,
      outrosPC: 250000,
      emprestimosLP: 1800000,
      outrosPNC: 400000,
      capitalSocial: 3000000,
      reservasLucros: 2200000,
      prejuizosAcumulados: 0
    },
    dreAnterior: {
      receitaBruta: 12000000,
      deducoes: 1800000,
      custos: 6200000,
      despesasOperacionais: 1500000,
      outrasDespesasReceitas: 100000,
      resultadoFinanceiro: -200000,
      impostos: 600000
    },
    dreAtual: {
      receitaBruta: 15000000,
      deducoes: 2200000,
      custos: 7500000,
      despesasOperacionais: 1800000,
      outrasDespesasReceitas: 100000,
      resultadoFinanceiro: -250000,
      impostos: 800000
    }
  };

  const handleDownloadJsonTemplate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(defaultTemplateData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "modelo_dados_confiaai.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  const handleDownloadCsvTemplate = () => {
    let csvRows = ["campo,valor_anterior,valor_atual"];
    csvRows.push(`empresa,${defaultTemplateData.empresa},`);
    csvRows.push(`descricao,${defaultTemplateData.descricao},`);
    csvRows.push(`anoAnterior,${defaultTemplateData.anoAnterior},`);
    csvRows.push(`anoAtual,${defaultTemplateData.anoAtual},`);

    const keys = [
      "disponivel", "clientes", "estoques", "outrosAC",
      "realizavelLP", "investimentos", "imobilizado", "intangivel",
      "fornecedores", "emprestimosCP", "obrigacoesFiscais", "outrosPC",
      "emprestimosLP", "outrosPNC",
      "capitalSocial", "reservasLucros", "prejuizosAcumulados",
      "receitaBruta", "deducoes", "custos", "despesasOperacionais",
      "outrasDespesasReceitas", "resultadoFinanceiro", "impostos"
    ];

    keys.forEach(k => {
      let prevVal = 0;
      let currVal = 0;

      if (k in defaultTemplateData.balancoAnterior) {
        prevVal = (defaultTemplateData.balancoAnterior as any)[k];
        currVal = (defaultTemplateData.balancoAtual as any)[k];
      } else if (k in defaultTemplateData.dreAnterior) {
        prevVal = (defaultTemplateData.dreAnterior as any)[k];
        currVal = (defaultTemplateData.dreAtual as any)[k];
      }

      csvRows.push(`${k},${prevVal},${currVal}`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", "modelo_dados_confiaai.csv");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  const handleFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);
    setGeneratedMarkdown(null);
    setUploadedFile({ name: file.name, type: file.type || "text/plain" });

    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        if (!result) {
          setUploadError("Não foi possível ler o arquivo PDF.");
          return;
        }

        const base64Data = result.split(",")[1];
        if (!base64Data) {
          setUploadError("Formato de arquivo PDF inválido.");
          return;
        }

        try {
          setUploadSuccess("Etapa 1: Atuando como o Construtor de arquivo Markdown v3... Lendo e convertendo o PDF para Markdown (.md)... Isso pode levar alguns segundos.");
          
          const response = await fetch("/api/analyze-pdf", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              pdfBase64: base64Data,
              fileName: file.name
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Erro ao processar o PDF no servidor.");
          }

          const responseData = await response.json();
          const { markdown, data } = responseData;
          
          setGeneratedMarkdown(markdown);
          validateAndLoadData(data, file.name);
        } catch (err: any) {
          setUploadError("Erro na inteligência artificial ao ler o PDF: " + (err.message || err));
          setUploadSuccess(null);
        }
      };

      reader.onerror = () => {
        setUploadError("Erro ao carregar o arquivo PDF.");
      };

      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setUploadError("Não foi possível ler o arquivo.");
        return;
      }

      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          validateAndLoadData(parsed, file.name);
        } else if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
          const parsed = parseCsvData(text);
          validateAndLoadData(parsed, file.name);
        } else {
          setUploadError("Formato de arquivo não suportado. Use .json, .csv ou .pdf.");
        }
      } catch (err: any) {
        setUploadError("Erro ao processar o arquivo: " + (err.message || err));
      }
    };

    reader.onerror = () => {
      setUploadError("Erro ao carregar o arquivo.");
    };

    reader.readAsText(file);
  };

  const parseCsvData = (text: string): any => {
    const lines = text.split(/\r?\n/);
    const result: any = {
      empresa: "Empresa Importada via CSV",
      descricao: "Demonstrativo financeiro importado via arquivo CSV.",
      anoAnterior: "2024",
      anoAtual: "2025",
      balancoAnterior: {},
      balancoAtual: {},
      dreAnterior: {},
      dreAtual: {}
    };

    const emptyBalanceSheet = {
      disponivel: 0, clientes: 0, estoques: 0, outrosAC: 0, ativoCirculante: 0,
      realizavelLP: 0, investimentos: 0, imobilizado: 0, intangivel: 0, ativoNaoCirculante: 0,
      ativoTotal: 0, fornecedores: 0, emprestimosCP: 0, obrigacoesFiscais: 0, outrosPC: 0,
      passivoCirculante: 0, emprestimosLP: 0, outrosPNC: 0, passivoNaoCirculante: 0,
      capitalSocial: 0, reservasLucros: 0, prejuizosAcumulados: 0, patrimonioLiquido: 0,
      passivoTotalPL: 0
    };

    const emptyDre = {
      receitaBruta: 0, deducoes: 0, receitaLiquida: 0, custos: 0, lucroBruto: 0,
      despesasOperacionais: 0, outrasDespesasReceitas: 0, ebit: 0, resultadoFinanceiro: 0,
      lair: 0, impostos: 0, lucroLiquido: 0
    };

    result.balancoAnterior = { ...emptyBalanceSheet };
    result.balancoAtual = { ...emptyBalanceSheet };
    result.dreAnterior = { ...emptyDre };
    result.dreAtual = { ...emptyDre };

    lines.forEach((line) => {
      const parts = line.split(/[,;]/);
      if (parts.length < 2) return;

      const key = parts[0].trim();
      const valAntStr = parts[1]?.trim() ?? "";
      const valAtuStr = parts[2]?.trim() ?? "";

      if (!key || key === "campo") return;

      if (key === "empresa") {
        result.empresa = valAntStr || "Empresa CSV";
      } else if (key === "descricao") {
        result.descricao = valAntStr || "Demonstrativos importados.";
      } else if (key === "anoAnterior") {
        result.anoAnterior = valAntStr || "2024";
      } else if (key === "anoAtual") {
        result.anoAtual = valAntStr || "2025";
      } else {
        const valAnt = parseFloat(valAntStr) || 0;
        const valAtu = parseFloat(valAtuStr) || 0;

        if (key in result.balancoAnterior) {
          result.balancoAnterior[key] = valAnt;
          result.balancoAtual[key] = valAtu;
        } 
        else if (key in result.dreAnterior) {
          result.dreAnterior[key] = valAnt;
          result.dreAtual[key] = valAtu;
        }
      }
    });

    [result.balancoAnterior, result.balancoAtual].forEach((period) => {
      period.ativoCirculante = period.disponivel + period.clientes + period.estoques + period.outrosAC;
      period.ativoNaoCirculante = period.realizavelLP + period.investimentos + period.imobilizado + period.intangivel;
      period.ativoTotal = period.ativoCirculante + period.ativoNaoCirculante;

      period.passivoCirculante = period.fornecedores + period.emprestimosCP + period.obrigacoesFiscais + period.outrosPC;
      period.passivoNaoCirculante = period.emprestimosLP + period.outrosPNC;
      period.patrimonioLiquido = period.capitalSocial + period.reservasLucros + period.prejuizosAcumulados;
      period.passivoTotalPL = period.passivoCirculante + period.passivoNaoCirculante + period.patrimonioLiquido;
    });

    [result.dreAnterior, result.dreAtual].forEach((period) => {
      period.receitaLiquida = period.receitaBruta - period.deducoes;
      period.lucroBruto = period.receitaLiquida - period.custos;
      period.ebit = period.lucroBruto - period.despesasOperacionais + (period.outrasDespesasReceitas || 0);
      period.lair = period.ebit + period.resultadoFinanceiro;
      period.lucroLiquido = period.lair - period.impostos;
    });

    return result;
  };

  const validateAndLoadData = (parsed: any, fileName: string) => {
    if (!parsed.balancoAtual || !parsed.dreAtual || !parsed.balancoAnterior || !parsed.dreAnterior) {
      setUploadError("Dados incompletos. O arquivo deve conter os blocos 'balancoAnterior', 'balancoAtual', 'dreAnterior' e 'dreAtual'.");
      return;
    }

    const sanitizeBalance = (b: any) => {
      const clean = {
        disponivel: Number(b.disponivel) || 0,
        clientes: Number(b.clientes) || 0,
        estoques: Number(b.estoques) || 0,
        outrosAC: Number(b.outrosAC) || 0,
        realizavelLP: Number(b.realizavelLP) || 0,
        investimentos: Number(b.investimentos) || 0,
        imobilizado: Number(b.imobilizado) || 0,
        intangivel: Number(b.intangivel) || 0,
        fornecedores: Number(b.fornecedores) || 0,
        emprestimosCP: Number(b.emprestimosCP) || 0,
        obrigacoesFiscais: Number(b.obrigacoesFiscais) || 0,
        outrosPC: Number(b.outrosPC) || 0,
        emprestimosLP: Number(b.emprestimosLP) || 0,
        outrosPNC: Number(b.outrosPNC) || 0,
        capitalSocial: Number(b.capitalSocial) || 0,
        reservasLucros: Number(b.reservasLucros) || 0,
        prejuizosAcumulados: Number(b.prejuizosAcumulados) || 0,
        ativoCirculante: 0,
        ativoNaoCirculante: 0,
        ativoTotal: 0,
        passivoCirculante: 0,
        passivoNaoCirculante: 0,
        patrimonioLiquido: 0,
        passivoTotalPL: 0
      };

      clean.ativoCirculante = clean.disponivel + clean.clientes + clean.estoques + clean.outrosAC;
      clean.ativoNaoCirculante = clean.realizavelLP + clean.investimentos + clean.imobilizado + clean.intangivel;
      clean.ativoTotal = clean.ativoCirculante + clean.ativoNaoCirculante;
      clean.passivoCirculante = clean.fornecedores + clean.emprestimosCP + clean.obrigacoesFiscais + clean.outrosPC;
      clean.passivoNaoCirculante = clean.emprestimosLP + clean.outrosPNC;
      clean.patrimonioLiquido = clean.capitalSocial + clean.reservasLucros + clean.prejuizosAcumulados;
      clean.passivoTotalPL = clean.passivoCirculante + clean.passivoNaoCirculante + clean.patrimonioLiquido;

      return clean;
    };

    const sanitizeDre = (d: any) => {
      const clean = {
        receitaBruta: Number(d.receitaBruta) || 0,
        deducoes: Number(d.deducoes) || 0,
        custos: Number(d.custos) || 0,
        despesasOperacionais: Number(d.despesasOperacionais) || 0,
        outrasDespesasReceitas: Number(d.outrasDespesasReceitas) || 0,
        resultadoFinanceiro: Number(d.resultadoFinanceiro) || 0,
        impostos: Number(d.impostos) || 0,
        receitaLiquida: 0,
        lucroBruto: 0,
        ebit: 0,
        lair: 0,
        lucroLiquido: 0
      };

      clean.receitaLiquida = clean.receitaBruta - clean.deducoes;
      clean.lucroBruto = clean.receitaLiquida - clean.custos;
      clean.ebit = clean.lucroBruto - clean.despesasOperacionais + clean.outrasDespesasReceitas;
      clean.lair = clean.ebit + clean.resultadoFinanceiro;
      clean.lucroLiquido = clean.lair - clean.impostos;

      return clean;
    };

    const cleanData: FinancialData = {
      anoAnterior: String(parsed.anoAnterior || "2024"),
      anoAtual: String(parsed.anoAtual || "2025"),
      balancoAnterior: sanitizeBalance(parsed.balancoAnterior),
      balancoAtual: sanitizeBalance(parsed.balancoAtual),
      dreAnterior: sanitizeDre(parsed.dreAnterior),
      dreAtual: sanitizeDre(parsed.dreAtual),
    };

    const companyName = parsed.empresa || `Empresa via ${fileName}`;
    const companyDesc = parsed.descricao || `Análise de demonstrativos importados via arquivo ${fileName}.`;

    onLoadData(cleanData, companyName, companyDesc);
    setUploadSuccess(`Sucesso! Carregado demonstrativo de "${companyName}" com êxito. O diagnóstico foi processado.`);
  };

  // Handle template selection
  const handleCaseChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    setGeneratedMarkdown(null);
    const template = CASE_TEMPLATES.find((c) => c.id === caseId);
    if (template) {
      onLoadData(template.data, template.empresa, template.descricao);
    }
  };

  // Generic input updater for Balance Sheet (Balanço Patrimonial)
  const handleBalanceChange = (period: "balancoAnterior" | "balancoAtual", key: string, value: number) => {
    const updated = { ...currentData };
    const targetPeriod = { ...updated[period] };
    
    // Set field value
    (targetPeriod as any)[key] = value;
    
    // Auto calculate totals
    targetPeriod.ativoCirculante = 
      (targetPeriod.disponivel || 0) + 
      (targetPeriod.clientes || 0) + 
      (targetPeriod.estoques || 0) + 
      (targetPeriod.outrosAC || 0);
      
    targetPeriod.ativoNaoCirculante = 
      (targetPeriod.realizavelLP || 0) + 
      (targetPeriod.investimentos || 0) + 
      (targetPeriod.imobilizado || 0) + 
      (targetPeriod.intangivel || 0);
      
    targetPeriod.ativoTotal = targetPeriod.ativoCirculante + targetPeriod.ativoNaoCirculante;
    
    targetPeriod.passivoCirculante = 
      (targetPeriod.fornecedores || 0) + 
      (targetPeriod.emprestimosCP || 0) + 
      (targetPeriod.obrigacoesFiscais || 0) + 
      (targetPeriod.outrosPC || 0);
      
    targetPeriod.passivoNaoCirculante = 
      (targetPeriod.emprestimosLP || 0) + 
      (targetPeriod.outrosPNC || 0);
      
    targetPeriod.patrimonioLiquido = 
      (targetPeriod.capitalSocial || 0) + 
      (targetPeriod.reservasLucros || 0) + 
      (targetPeriod.prejuizosAcumulados || 0);
      
    targetPeriod.passivoTotalPL = 
      targetPeriod.passivoCirculante + 
      targetPeriod.passivoNaoCirculante + 
      targetPeriod.patrimonioLiquido;

    updated[period] = targetPeriod;
    onUpdateData(updated);
  };

  // Generic input updater for DRE
  const handleDreChange = (period: "dreAnterior" | "dreAtual", key: string, value: number) => {
    const updated = { ...currentData };
    const targetPeriod = { ...updated[period] };
    
    // Set value
    (targetPeriod as any)[key] = value;
    
    // Auto calculations
    targetPeriod.receitaLiquida = (targetPeriod.receitaBruta || 0) - (targetPeriod.deducoes || 0);
    targetPeriod.lucroBruto = targetPeriod.receitaLiquida - (targetPeriod.custos || 0);
    targetPeriod.ebit = targetPeriod.lucroBruto - (targetPeriod.despesasOperacionais || 0) + (targetPeriod.outrasDespesasReceitas || 0);
    targetPeriod.lair = targetPeriod.ebit + (targetPeriod.resultadoFinanceiro || 0);
    targetPeriod.lucroLiquido = targetPeriod.lair - (targetPeriod.impostos || 0);

    updated[period] = targetPeriod;
    onUpdateData(updated);
  };

  // JSON Load helper
  const handleJsonSubmit = () => {
    try {
      setJsonError(null);
      const parsed = JSON.parse(customJsonInput);
      if (!parsed.balancoAtual || !parsed.dreAtual) {
        throw new Error("O JSON precisa conter pelo menos 'balancoAtual' e 'dreAtual'.");
      }
      onLoadData(parsed, parsed.empresa || "Empresa Importada", parsed.descricao || "Demonstrativos financeiros importados via JSON.");
      setActiveTab("balanco");
    } catch (e: any) {
      setJsonError(e.message || "Formato JSON inválido.");
    }
  };

  // Check equation validation (Ativo = Passivo + PL)
  const isAnteriorBalanced = Math.abs(currentData.balancoAnterior.ativoTotal - currentData.balancoAnterior.passivoTotalPL) < 5;
  const isAtualBalanced = Math.abs(currentData.balancoAtual.ativoTotal - currentData.balancoAtual.passivoTotalPL) < 5;

  return (
    <div className="bg-white border-r border-slate-200 w-full lg:w-96 flex-col shrink-0 flex h-auto lg:h-[calc(100vh-73px)] sticky top-[73px]" id="sidebar-inputs">
      
      {/* 1. Case Select Template */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          Selecione Cenário Contábil
        </label>
        <select
          value={selectedCaseId}
          onChange={(e) => handleCaseChange(e.target.value)}
          className="w-full bg-white border border-slate-200 text-slate-950 rounded-lg text-sm px-3 py-2 font-semibold shadow-xs hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer"
        >
          {CASE_TEMPLATES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({c.empresa.split(" ")[0]})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          {CASE_TEMPLATES.find(c => c.id === selectedCaseId)?.descricao}
        </p>
      </div>

      {/* 2. Spreadsheet form Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-[10px] sm:text-xs font-bold uppercase tracking-wider font-mono">
        <button
          onClick={() => setActiveTab("balanco")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === "balanco"
              ? "border-slate-900 text-slate-900 bg-slate-50/50"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Balanço
        </button>
        <button
          onClick={() => setActiveTab("dre")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === "dre"
              ? "border-slate-900 text-slate-900 bg-slate-50/50"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          DRE
        </button>
        <button
          onClick={() => setActiveTab("json")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === "json"
              ? "border-slate-900 text-slate-900 bg-slate-50/50"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          JSON
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === "upload"
              ? "border-slate-900 text-slate-900 bg-slate-50/50"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Arquivo
        </button>
      </div>

      {/* 3. Input Panels (Scrollable area) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-800">
        
        {activeTab === "balanco" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Balanço Patrimonial</span>
              <div className="flex gap-1.5 text-[10px] font-mono font-semibold">
                <span className={`px-1.5 py-0.5 rounded-sm ${isAnteriorBalanced ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                  {currentData.anoAnterior}: {isAnteriorBalanced ? "Equilibrado" : "Desequilibrado"}
                </span>
                <span className={`px-1.5 py-0.5 rounded-sm ${isAtualBalanced ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                  {currentData.anoAtual}: {isAtualBalanced ? "Equilibrado" : "Desequilibrado"}
                </span>
              </div>
            </div>

            {/* Ativo Circulante Section */}
            <div className="space-y-2 border-l-2 border-emerald-500 pl-3">
              <h4 className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Ativo Circulante (Recursos Disponíveis)
              </h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Caixa / Disponível ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.disponivel}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "disponivel", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Caixa / Disponível ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.disponivel}
                    onChange={(e) => handleBalanceChange("balancoAtual", "disponivel", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Clientes / Receber ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.clientes}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "clientes", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Clientes / Receber ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.clientes}
                    onChange={(e) => handleBalanceChange("balancoAtual", "clientes", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Estoques ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.estoques}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "estoques", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Estoques ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.estoques}
                    onChange={(e) => handleBalanceChange("balancoAtual", "estoques", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Outros AC ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.outrosAC}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "outrosAC", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Outros AC ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.outrosAC}
                    onChange={(e) => handleBalanceChange("balancoAtual", "outrosAC", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Ativo Não Circulante Section */}
            <div className="space-y-2 border-l-2 border-slate-500 pl-3">
              <h4 className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Ativo Não Circulante (Realizável LP/Estrutural)
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Realizável LP ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.realizavelLP}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "realizavelLP", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Realizável LP ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.realizavelLP}
                    onChange={(e) => handleBalanceChange("balancoAtual", "realizavelLP", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Imobilizado ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.imobilizado}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "imobilizado", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Imobilizado ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.imobilizado}
                    onChange={(e) => handleBalanceChange("balancoAtual", "imobilizado", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Passivo Circulante Section */}
            <div className="space-y-2 border-l-2 border-amber-500 pl-3">
              <h4 className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Passivo Circulante (Obrigações CP)
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Fornecedores ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.fornecedores}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "fornecedores", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Fornecedores ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.fornecedores}
                    onChange={(e) => handleBalanceChange("balancoAtual", "fornecedores", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Empréstimos CP ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.emprestimosCP}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "emprestimosCP", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right font-bold text-amber-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Empréstimos CP ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.emprestimosCP}
                    onChange={(e) => handleBalanceChange("balancoAtual", "emprestimosCP", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right font-bold text-amber-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Passivo Não Circulante & Patrimônio Líquido */}
            <div className="space-y-2 border-l-2 border-rose-500 pl-3">
              <h4 className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Exigível LP & Patrimônio Líquido
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Financ. Longo Prazo ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.emprestimosLP}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "emprestimosLP", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Financ. Longo Prazo ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.emprestimosLP}
                    onChange={(e) => handleBalanceChange("balancoAtual", "emprestimosLP", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Capital Social ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.capitalSocial}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "capitalSocial", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Capital Social ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.capitalSocial}
                    onChange={(e) => handleBalanceChange("balancoAtual", "capitalSocial", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Prejuízos Acum. ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.balancoAnterior.prejuizosAcumulados}
                    onChange={(e) => handleBalanceChange("balancoAnterior", "prejuizosAcumulados", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right text-rose-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Prejuízos Acum. ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.balancoAtual.prejuizosAcumulados}
                    onChange={(e) => handleBalanceChange("balancoAtual", "prejuizosAcumulados", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right text-rose-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dre" && (
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">DRE (Demonstração do Resultado)</span>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Receita Bruta ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.dreAnterior.receitaBruta}
                    onChange={(e) => handleDreChange("dreAnterior", "receitaBruta", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right text-emerald-700 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Receita Bruta ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.dreAtual.receitaBruta}
                    onChange={(e) => handleDreChange("dreAtual", "receitaBruta", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right text-emerald-700 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Deduções / Impostos ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.dreAnterior.deducoes}
                    onChange={(e) => handleDreChange("dreAnterior", "deducoes", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Deduções / Impostos ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.dreAtual.deducoes}
                    onChange={(e) => handleDreChange("dreAtual", "deducoes", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Custos CPV ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.dreAnterior.custos}
                    onChange={(e) => handleDreChange("dreAnterior", "custos", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Custos CPV ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.dreAtual.custos}
                    onChange={(e) => handleDreChange("dreAtual", "custos", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Despesas Operac. ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.dreAnterior.despesasOperacionais}
                    onChange={(e) => handleDreChange("dreAnterior", "despesasOperacionais", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Despesas Operac. ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.dreAtual.despesasOperacionais}
                    onChange={(e) => handleDreChange("dreAtual", "despesasOperacionais", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Resultado Financeiro ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.dreAnterior.resultadoFinanceiro}
                    onChange={(e) => handleDreChange("dreAnterior", "resultadoFinanceiro", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right text-rose-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Resultado Financeiro ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.dreAtual.resultadoFinanceiro}
                    onChange={(e) => handleDreChange("dreAtual", "resultadoFinanceiro", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right text-rose-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Impostos Lucro ({currentData.anoAnterior})</label>
                  <input
                    type="number"
                    value={currentData.dreAnterior.impostos}
                    onChange={(e) => handleDreChange("dreAnterior", "impostos", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Impostos Lucro ({currentData.anoAtual})</label>
                  <input
                    type="number"
                    value={currentData.dreAtual.impostos}
                    onChange={(e) => handleDreChange("dreAtual", "impostos", Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-950 font-mono text-xs rounded-md border border-slate-200 px-2 py-1.5 text-right focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "json" && (
          <div className="space-y-3 flex flex-col h-full min-h-[300px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Importar Estrutura JSON</span>
            <p className="text-[11px] text-slate-500">Cole uma estrutura contábil completa para preenchimento instantâneo:</p>
            <textarea
              value={customJsonInput}
              onChange={(e) => setCustomJsonInput(e.target.value)}
              placeholder='{ "empresa": "Sua Empresa S.A.", "balancoAtual": { "disponivel": 1000000, ... }, "dreAtual": { ... } }'
              className="flex-1 w-full p-2.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-xs font-mono resize-none focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            ></textarea>
            {jsonError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[10px] p-2 rounded-lg flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}
            <button
              onClick={handleJsonSubmit}
              className="w-full bg-slate-950 text-white font-mono font-bold text-xs py-2 rounded-lg hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Carregar JSON
            </button>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="space-y-4 flex flex-col h-full animate-in fade-in duration-200">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Importar Arquivo (.JSON, .CSV ou .PDF)</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Arraste e solte ou selecione seu demonstrativo contábil em formato JSON, CSV ou PDF (Demonstrações Contábeis completas) para processar diagnósticos instantâneos por inteligência artificial.
            </p>

            {/* Drag & Drop Visual Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2.5 min-h-[160px] cursor-pointer ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50/30 text-emerald-700"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-50/50 text-slate-500 hover:border-slate-300"
              }`}
            >
              <Upload className={`w-8 h-8 transition-transform ${isDragging ? "scale-110 text-emerald-600" : "text-slate-400"}`} />
              <div className="text-xs font-sans">
                <span className="font-bold text-slate-800">Arraste um arquivo</span> ou clique para navegar
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Suporta .JSON, .CSV e .PDF</span>
              <input
                type="file"
                id="file-upload-input"
                accept=".json,.csv,.txt,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="file-upload-input"
                className="mt-1 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold rounded-md cursor-pointer transition-all shadow-xs"
              >
                Selecionar Arquivo
              </label>
            </div>

            {/* Success and Error messages */}
            {uploadError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-start gap-2 animate-in fade-in duration-100">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Falha na importação</p>
                  <p className="text-[10px] leading-relaxed text-rose-700">{uploadError}</p>
                </div>
              </div>
            )}

            {uploadSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-start gap-2 animate-in fade-in duration-100">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Arquivo carregado!</p>
                  <p className="text-[10px] leading-relaxed text-emerald-700">{uploadSuccess}</p>
                </div>
              </div>
            )}

            {/* Se houver Markdown gerado por Construtor de arquivo Markdown v3 */}
            {generatedMarkdown && (
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-3 border border-slate-800 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-300">
                    Markdown (.md) Otimizado
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  O PDF foi convertido com sucesso para Markdown pelo <strong>Construtor de arquivo Markdown v3</strong>, otimizado para RAG e LLMs.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const element = document.createElement("a");
                      const fileBlob = new Blob([generatedMarkdown], { type: 'text/markdown' });
                      element.href = URL.createObjectURL(fileBlob);
                      element.download = `${uploadedFile?.name ? uploadedFile.name.replace(/\.[^/.]+$/, "") : "demonstrativo"}_v3.md`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Baixar Arquivo .md
                  </button>
                  <button
                    onClick={() => {
                      setShowMdPreview(!showMdPreview);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] rounded-md transition-all cursor-pointer"
                  >
                    {showMdPreview ? "Ocultar" : "Visualizar"}
                  </button>
                </div>

                {showMdPreview && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 max-h-48 overflow-y-auto text-[10px] font-mono leading-relaxed text-slate-300 whitespace-pre-wrap select-all">
                    {generatedMarkdown}
                  </div>
                )}
              </div>
            )}

            {/* Models Download Section */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Modelos de Entrada</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadJsonTemplate}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Baixar modelo estruturado em JSON"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  Modelo JSON
                </button>
                <button
                  onClick={handleDownloadCsvTemplate}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Baixar modelo estruturado em CSV"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  Modelo CSV
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 4. Large Call-To-Action to run the financial model */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-sm font-bold tracking-wide py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Calculando Diagnóstico..." : "Processar Diagnóstico"}
        </button>
      </div>
    </div>
  );
}
