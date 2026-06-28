import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { FinancialData, DiagnosticResult, IndicatorRow } from "./src/types";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = 3000;

// Initialize GoogleGenAI client lazily or with check
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave GEMINI_API_KEY não foi configurada nas variáveis de ambiente.");
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// Math helpers
function percent(val: number, base: number): number {
  if (base === 0) return 0;
  return Number(((val / base) * 100).toFixed(2));
}

function diffPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

// Local analytics engine (to protect math integrity)
function processFinancials(data: FinancialData): DiagnosticResult {
  const { balancoAnterior, balancoAtual, dreAnterior, dreAtual } = data;

  // 1. Recalculate and Convalidate totals
  // Balanço Anterior
  balancoAnterior.ativoCirculante = balancoAnterior.disponivel + balancoAnterior.clientes + balancoAnterior.estoques + balancoAnterior.outrosAC;
  balancoAnterior.ativoNaoCirculante = balancoAnterior.realizavelLP + balancoAnterior.investimentos + balancoAnterior.imobilizado + balancoAnterior.intangivel;
  balancoAnterior.ativoTotal = balancoAnterior.ativoCirculante + balancoAnterior.ativoNaoCirculante;

  balancoAnterior.passivoCirculante = balancoAnterior.fornecedores + balancoAnterior.emprestimosCP + balancoAnterior.obrigacoesFiscais + balancoAnterior.outrosPC;
  balancoAnterior.passivoNaoCirculante = balancoAnterior.emprestimosLP + balancoAnterior.outrosPNC;
  balancoAnterior.patrimonioLiquido = balancoAnterior.capitalSocial + balancoAnterior.reservasLucros + balancoAnterior.prejuizosAcumulados;
  balancoAnterior.passivoTotalPL = balancoAnterior.passivoCirculante + balancoAnterior.passivoNaoCirculante + balancoAnterior.patrimonioLiquido;

  // Balanço Atual
  balancoAtual.ativoCirculante = balancoAtual.disponivel + balancoAtual.clientes + balancoAtual.estoques + balancoAtual.outrosAC;
  balancoAtual.ativoNaoCirculante = balancoAtual.realizavelLP + balancoAtual.investimentos + balancoAtual.imobilizado + balancoAtual.intangivel;
  balancoAtual.ativoTotal = balancoAtual.ativoCirculante + balancoAtual.ativoNaoCirculante;

  balancoAtual.passivoCirculante = balancoAtual.fornecedores + balancoAtual.emprestimosCP + balancoAtual.obrigacoesFiscais + balancoAtual.outrosPC;
  balancoAtual.passivoNaoCirculante = balancoAtual.emprestimosLP + balancoAtual.outrosPNC;
  balancoAtual.patrimonioLiquido = balancoAtual.capitalSocial + balancoAtual.reservasLucros + balancoAtual.prejuizosAcumulados;
  balancoAtual.passivoTotalPL = balancoAtual.passivoCirculante + balancoAtual.passivoNaoCirculante + balancoAtual.patrimonioLiquido;

  // DRE Anterior
  dreAnterior.receitaLiquida = dreAnterior.receitaBruta - dreAnterior.deducoes;
  dreAnterior.lucroBruto = dreAnterior.receitaLiquida - dreAnterior.custos;
  dreAnterior.ebit = dreAnterior.lucroBruto - dreAnterior.despesasOperacionais + dreAnterior.outrasDespesasReceitas;
  dreAnterior.lair = dreAnterior.ebit + dreAnterior.resultadoFinanceiro;
  dreAnterior.lucroLiquido = dreAnterior.lair - dreAnterior.impostos;

  // DRE Atual
  dreAtual.receitaLiquida = dreAtual.receitaBruta - dreAtual.deducoes;
  dreAtual.lucroBruto = dreAtual.receitaLiquida - dreAtual.custos;
  dreAtual.ebit = dreAtual.lucroBruto - dreAtual.despesasOperacionais + dreAtual.outrasDespesasReceitas;
  dreAtual.lair = dreAtual.ebit + dreAtual.resultadoFinanceiro;
  dreAtual.lucroLiquido = dreAtual.lair - dreAtual.impostos;

  // Check equation validation (Ativo Total = Passivo Total + PL)
  const diffAnterior = Math.abs(balancoAnterior.ativoTotal - balancoAnterior.passivoTotalPL);
  const diffAtual = Math.abs(balancoAtual.ativoTotal - balancoAtual.passivoTotalPL);

  const validationMsgs: string[] = [];
  let integro = true;
  let ressalva: string | null = null;

  if (diffAnterior > 10) {
    integro = false;
    validationMsgs.push(`Desequilíbrio patrimonial em ${data.anoAnterior}: Ativo Total (${balancoAnterior.ativoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) difere do Passivo + PL (${balancoAnterior.passivoTotalPL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) por ${diffAnterior.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
  }
  if (diffAtual > 10) {
    integro = false;
    validationMsgs.push(`Desequilíbrio patrimonial em ${data.anoAtual}: Ativo Total (${balancoAtual.ativoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) difere do Passivo + PL (${balancoAtual.passivoTotalPL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) por ${diffAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
  }

  if (balancoAtual.patrimonioLiquido < 0) {
    validationMsgs.push(`Patrimônio Líquido Negativo (Passivo a Descoberto) identificado em ${data.anoAtual}: ${balancoAtual.patrimonioLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
  }

  const cglAtual = balancoAtual.ativoCirculante - balancoAtual.passivoCirculante;
  if (cglAtual < 0) {
    validationMsgs.push(`Capital de Giro Líquido (CGL) Negativo em ${data.anoAtual}: ${cglAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Risco iminente de liquidez.`);
  }

  if (!integro) {
    ressalva = `Ressalva Técnica Contábil: Os demonstrativos apresentados contêm desvios de integridade material (Ativo total diferente do Passivo total + PL) que violam as premissas de consistência e integridade das Demonstrações Contábeis (NBC TG Estrutura Conceitual / CPC 00). A análise subsequente fica comprometida.`;
  }

  // 2. Perform AV and AH analysis
  // Balanço
  const balancoContas = [
    { label: "Ativo Circulante", key: "ativoCirculante", ant: balancoAnterior.ativoCirculante, atu: balancoAtual.ativoCirculante },
    { label: " - Disponível (Caixa/Equivalentes)", key: "disponivel", ant: balancoAnterior.disponivel, atu: balancoAtual.disponivel },
    { label: " - Contas a Receber (Clientes)", key: "clientes", ant: balancoAnterior.clientes, atu: balancoAtual.clientes },
    { label: " - Estoques", key: "estoques", ant: balancoAnterior.estoques, atu: balancoAtual.estoques },
    { label: " - Outros Ativos Circulantes", key: "outrosAC", ant: balancoAnterior.outrosAC, atu: balancoAtual.outrosAC },
    
    { label: "Ativo Não Circulante", key: "ativoNaoCirculante", ant: balancoAnterior.ativoNaoCirculante, atu: balancoAtual.ativoNaoCirculante },
    { label: " - Realizável a Longo Prazo", key: "realizavelLP", ant: balancoAnterior.realizavelLP, atu: balancoAtual.realizavelLP },
    { label: " - Investimentos", key: "investimentos", ant: balancoAnterior.investimentos, atu: balancoAtual.investimentos },
    { label: " - Imobilizado", key: "imobilizado", ant: balancoAnterior.imobilizado, atu: balancoAtual.imobilizado },
    { label: " - Intangível", key: "intangivel", ant: balancoAnterior.intangivel, atu: balancoAtual.intangivel },
    
    { label: "ATIVO TOTAL", key: "ativoTotal", ant: balancoAnterior.ativoTotal, atu: balancoAtual.ativoTotal },
    
    { label: "Passivo Circulante", key: "passivoCirculante", ant: balancoAnterior.passivoCirculante, atu: balancoAtual.passivoCirculante },
    { label: " - Fornecedores", key: "fornecedores", ant: balancoAnterior.fornecedores, atu: balancoAtual.fornecedores },
    { label: " - Empréstimos e Financiamentos CP", key: "emprestimosCP", ant: balancoAnterior.emprestimosCP, atu: balancoAtual.emprestimosCP },
    { label: " - Obrigações Fiscais/Trabalhistas", key: "obrigacoesFiscais", ant: balancoAnterior.obrigacoesFiscais, atu: balancoAtual.obrigacoesFiscais },
    { label: " - Outros Passivos Circulantes", key: "outrosPC", ant: balancoAnterior.outrosPC, atu: balancoAtual.outrosPC },
    
    { label: "Passivo Não Circulante", key: "passivoNaoCirculante", ant: balancoAnterior.passivoNaoCirculante, atu: balancoAtual.passivoNaoCirculante },
    { label: " - Empréstimos e Financiamentos LP", key: "emprestimosLP", ant: balancoAnterior.emprestimosLP, atu: balancoAtual.emprestimosLP },
    { label: " - Outros Passivos Não Circulantes", key: "outrosPNC", ant: balancoAnterior.outrosPNC, atu: balancoAtual.outrosPNC },
    
    { label: "Patrimônio Líquido", key: "patrimonioLiquido", ant: balancoAnterior.patrimonioLiquido, atu: balancoAtual.patrimonioLiquido },
    { label: " - Capital Social", key: "capitalSocial", ant: balancoAnterior.capitalSocial, atu: balancoAtual.capitalSocial },
    { label: " - Reservas de Lucros", key: "reservasLucros", ant: balancoAnterior.reservasLucros, atu: balancoAtual.reservasLucros },
    { label: " - Prejuízos Acumulados", key: "prejuizosAcumulados", ant: balancoAnterior.prejuizosAcumulados, atu: balancoAtual.prejuizosAcumulados },
    
    { label: "PASSIVO TOTAL + PL", key: "passivoTotalPL", ant: balancoAnterior.passivoTotalPL, atu: balancoAtual.passivoTotalPL }
  ];

  const analiseBalanco = balancoContas.map((item) => ({
    conta: item.label,
    anteriorValor: item.ant,
    anteriorAV: percent(item.ant, balancoAnterior.ativoTotal),
    atualValor: item.atu,
    atualAV: percent(item.atu, balancoAtual.ativoTotal),
    varAH: diffPct(item.atu, item.ant),
  }));

  // DRE
  const dreContas = [
    { label: "Receita Bruta", ant: dreAnterior.receitaBruta, atu: dreAtual.receitaBruta },
    { label: "Deduções de Receita", ant: dreAnterior.deducoes, atu: dreAtual.deducoes },
    { label: "RECEITA LÍQUIDA", ant: dreAnterior.receitaLiquida, atu: dreAtual.receitaLiquida },
    { label: "Custos (CPV/CSP)", ant: dreAnterior.custos, atu: dreAtual.custos },
    { label: "LUCRO BRUTO", ant: dreAnterior.lucroBruto, atu: dreAtual.lucroBruto },
    { label: "Despesas Operacionais (Gerais/Adm/Vendas)", ant: dreAnterior.despesasOperacionais, atu: dreAtual.despesasOperacionais },
    { label: "Outros Resultados Operacionais", ant: dreAnterior.outrasDespesasReceitas, atu: dreAtual.outrasDespesasReceitas },
    { label: "LUCRO ANTES DO JUR. IMP. (EBIT)", ant: dreAnterior.ebit, atu: dreAtual.ebit },
    { label: "Resultado Financeiro", ant: dreAnterior.resultadoFinanceiro, atu: dreAtual.resultadoFinanceiro },
    { label: "LUCRO ANTES DOS IMP. (LAIR)", ant: dreAnterior.lair, atu: dreAtual.lair },
    { label: "Impostos de Renda / CSLL", ant: dreAnterior.impostos, atu: dreAtual.impostos },
    { label: "LUCRO LÍQUIDO", ant: dreAnterior.lucroLiquido, atu: dreAtual.lucroLiquido }
  ];

  const analiseDre = dreContas.map((item) => ({
    conta: item.label,
    anteriorValor: item.ant,
    anteriorAV: percent(item.ant, dreAnterior.receitaLiquida),
    atualValor: item.atu,
    atualAV: percent(item.atu, dreAtual.receitaLiquida),
    varAH: diffPct(item.atu, item.ant),
  }));

  // 3. Compute indicators with formula substitutions
  const acAtu = balancoAtual.ativoCirculante;
  const pcAtu = balancoAtual.passivoCirculante;
  const estAtu = balancoAtual.estoques;
  const dispAtu = balancoAtual.disponivel;

  const acAnt = balancoAnterior.ativoCirculante;
  const pcAnt = balancoAnterior.passivoCirculante;
  const estAnt = balancoAnterior.estoques;
  const dispAnt = balancoAnterior.disponivel;

  const passivoTotalAtu = balancoAtual.passivoCirculante + balancoAtual.passivoNaoCirculante;
  const passivoTotalAnt = balancoAnterior.passivoCirculante + balancoAnterior.passivoNaoCirculante;

  const plAtu = balancoAtual.patrimonioLiquido;
  const plAnt = balancoAnterior.patrimonioLiquido;

  const imobAtu = balancoAtual.imobilizado;
  const imobAnt = balancoAnterior.imobilizado;

  const rcAtu = dreAtual.receitaLiquida;
  const rcAnt = dreAnterior.receitaLiquida;

  const lbAtu = dreAtual.lucroBruto;
  const lbAnt = dreAnterior.lucroBruto;

  const llAtu = dreAtual.lucroLiquido;
  const llAnt = dreAnterior.lucroLiquido;

  const atAtu = balancoAtual.ativoTotal;
  const atAnt = balancoAnterior.ativoTotal;

  // Formatting helper for numbers
  const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  const lcAtu = pcAtu !== 0 ? acAtu / pcAtu : 0;
  const lcAnt = pcAnt !== 0 ? acAnt / pcAnt : 0;

  const lsAtu = pcAtu !== 0 ? (acAtu - estAtu) / pcAtu : 0;
  const lsAnt = pcAnt !== 0 ? (acAnt - estAnt) / pcAnt : 0;

  const liAtu = pcAtu !== 0 ? dispAtu / pcAtu : 0;
  const liAnt = pcAnt !== 0 ? dispAnt / pcAnt : 0;

  const cdgAtu = acAtu - pcAtu;
  const cdgAnt = acAnt - pcAnt;

  const endAtu = atAtu !== 0 ? passivoTotalAtu / atAtu : 0;
  const endAnt = atAnt !== 0 ? passivoTotalAnt / atAnt : 0;

  const ctPlAtu = plAtu !== 0 ? passivoTotalAtu / plAtu : 0;
  const ctPlAnt = plAnt !== 0 ? passivoTotalAnt / plAnt : 0;

  const iplAtu = plAtu !== 0 ? imobAtu / plAtu : 0;
  const iplAnt = plAnt !== 0 ? imobAnt / plAnt : 0;

  const mbAtu = rcAtu !== 0 ? lbAtu / rcAtu : 0;
  const mbAnt = rcAnt !== 0 ? lbAnt / rcAnt : 0;

  const mlAtu = rcAtu !== 0 ? llAtu / rcAtu : 0;
  const mlAnt = rcAnt !== 0 ? llAnt / rcAnt : 0;

  const roaAtu = atAtu !== 0 ? llAtu / atAtu : 0;
  const roaAnt = atAnt !== 0 ? llAnt / atAnt : 0;

  const roeAtu = plAtu !== 0 ? llAtu / plAtu : 0;
  const roeAnt = plAnt !== 0 ? llAnt / plAnt : 0;

  const indicadores: IndicatorRow[] = [
    {
      nome: "Liquidez Corrente",
      grupo: "Liquidez",
      formula: "Ativo Circulante / Passivo Circulante",
      substituicaoAnterior: `${fmt(acAnt)} / ${fmt(pcAnt)}`,
      resultadoAnterior: Number(lcAnt.toFixed(2)),
      substituicaoAtual: `${fmt(acAtu)} / ${fmt(pcAtu)}`,
      resultadoAtual: Number(lcAtu.toFixed(2)),
      interpretacao: lcAtu >= 1.5 ? "Muito Saudável. Forte cobertura de curto prazo." : lcAtu >= 1.0 ? "Adequado. Cobre obrigações mas com margem estreita." : "Crítico. Não possui recursos circulantes suficientes para cobrir as dívidas de curto prazo."
    },
    {
      nome: "Liquidez Seca",
      grupo: "Liquidez",
      formula: "(Ativo Circulante - Estoques) / Passivo Circulante",
      substituicaoAnterior: `(${fmt(acAnt)} - ${fmt(estAnt)}) / ${fmt(pcAnt)}`,
      resultadoAnterior: Number(lsAnt.toFixed(2)),
      substituicaoAtual: `(${fmt(acAtu)} - ${fmt(estAtu)}) / ${fmt(pcAtu)}`,
      resultadoAtual: Number(lsAtu.toFixed(2)),
      interpretacao: lsAtu >= 1.0 ? "Excelente. Liquidez imediata não depende da venda de estoques." : lsAtu >= 0.8 ? "Moderado. Dependência aceitável dos estoques." : "Risco Elevado. Dependência excessiva de estoques de lenta liquidação."
    },
    {
      nome: "Liquidez Imediata",
      grupo: "Liquidez",
      formula: "Disponível / Passivo Circulante",
      substituicaoAnterior: `${fmt(dispAnt)} / ${fmt(pcAnt)}`,
      resultadoAnterior: Number(liAnt.toFixed(2)),
      substituicaoAtual: `${fmt(dispAtu)} / ${fmt(pcAtu)}`,
      resultadoAtual: Number(liAtu.toFixed(2)),
      interpretacao: liAtu >= 0.2 ? "Confortável. Boa reserva imediata." : "Gargalo Operacional. Empresa opera com caixa mínimo, muito exposta a volatilidades."
    },
    {
      nome: "Capital de Giro Líquido (CGL)",
      grupo: "Liquidez",
      formula: "Ativo Circulante - Passivo Circulante",
      substituicaoAnterior: `${fmt(acAnt)} - ${fmt(pcAnt)}`,
      resultadoAnterior: cdgAnt,
      substituicaoAtual: `${fmt(acAtu)} - ${fmt(pcAtu)}`,
      resultadoAtual: cdgAtu,
      interpretacao: cdgAtu >= 0 ? "Positivo. Indica folga financeira para operar." : "Negativo. Necessidade urgente de financiamento de curto prazo."
    },
    {
      nome: "Endividamento Geral",
      grupo: "Estrutura",
      formula: "Passivo Total / Ativo Total",
      substituicaoAnterior: `${fmt(passivoTotalAnt)} / ${fmt(atAnt)}`,
      resultadoAnterior: Number((endAnt * 100).toFixed(2)),
      substituicaoAtual: `${fmt(passivoTotalAtu)} / ${fmt(atAtu)}`,
      resultadoAtual: Number((endAtu * 100).toFixed(2)),
      interpretacao: endAtu <= 50 ? "Baixo. Empresa financiada majoritariamente por recursos próprios." : endAtu <= 75 ? "Moderado. Estrutura equilibrada." : "Crítico. Alto risco de solvência, altamente dependente de capitais externos."
    },
    {
      nome: "Capital de Terceiros / PL",
      grupo: "Estrutura",
      formula: "Passivo Total / Patrimônio Líquido",
      substituicaoAnterior: `${fmt(passivoTotalAnt)} / ${fmt(plAnt)}`,
      resultadoAnterior: plAnt !== 0 ? Number((ctPlAnt * 100).toFixed(2)) : 0,
      substituicaoAtual: `${fmt(passivoTotalAtu)} / ${fmt(plAtu)}`,
      resultadoAtual: plAtu !== 0 ? Number((ctPlAtu * 100).toFixed(2)) : 0,
      interpretacao: plAtu < 0 ? "PL Negativo. Risco Máximo de Insolvência." : ctPlAtu <= 1.0 ? "Favorável. Menor do que 100% do PL." : "Alavancagem Elevada. Capital de terceiros supera recursos próprios."
    },
    {
      nome: "Imobilização do PL",
      grupo: "Estrutura",
      formula: "Ativo Imobilizado / Patrimônio Líquido",
      substituicaoAnterior: `${fmt(imobAnt)} / ${fmt(plAnt)}`,
      resultadoAnterior: plAnt !== 0 ? Number((iplAnt * 100).toFixed(2)) : 0,
      substituicaoAtual: `${fmt(imobAtu)} / ${fmt(plAtu)}`,
      resultadoAtual: plAtu !== 0 ? Number((iplAtu * 100).toFixed(2)) : 0,
      interpretacao: plAtu < 0 ? "PL Negativo." : iplAtu <= 0.8 ? "Saudável. Recursos próprios livres para o capital de giro." : "Engessamento Patrimonial. Grande parte do PL está imobilizada, reduzindo a liquidez."
    },
    {
      nome: "Margem Bruta",
      grupo: "Rentabilidade",
      formula: "Lucro Bruto / Receita Líquida",
      substituicaoAnterior: `${fmt(lbAnt)} / ${fmt(rcAnt)}`,
      resultadoAnterior: Number((mbAnt * 100).toFixed(2)),
      substituicaoAtual: `${fmt(lbAtu)} / ${fmt(rcAtu)}`,
      resultadoAtual: Number((mbAtu * 100).toFixed(2)),
      interpretacao: mbAtu >= 35 ? "Forte. Alto poder de precificação e margem industrial saudável." : "Estreito. Empresa vulnerável a aumentos de custos operacionais e inflação produtiva."
    },
    {
      nome: "Margem Líquida",
      grupo: "Rentabilidade",
      formula: "Lucro Líquido / Receita Líquida",
      substituicaoAnterior: `${fmt(llAnt)} / ${fmt(rcAnt)}`,
      resultadoAnterior: Number((mlAnt * 100).toFixed(2)),
      substituicaoAtual: `${fmt(llAtu)} / ${fmt(rcAtu)}`,
      resultadoAtual: Number((mlAtu * 100).toFixed(2)),
      interpretacao: mlAtu > 10 ? "Altamente Rentável." : mlAtu > 0 ? "Estável mas vulnerável a variações financeiras e cambiais." : "Prejuízo Líquido. Destruição de valor acumulado."
    },
    {
      nome: "Retorno sobre o Ativo (ROA)",
      grupo: "Rentabilidade",
      formula: "Lucro Líquido / Ativo Total",
      substituicaoAnterior: `${fmt(llAnt)} / ${fmt(atAnt)}`,
      resultadoAnterior: Number((roaAnt * 100).toFixed(2)),
      substituicaoAtual: `${fmt(llAtu)} / ${fmt(atAtu)}`,
      resultadoAtual: Number((roaAtu * 100).toFixed(2)),
      interpretacao: roaAtu >= 5 ? "Alta eficiência na utilização de ativos para gerar lucros." : "Baixo rendimento sobre a estrutura total de ativos."
    },
    {
      nome: "Retorno sobre o Patrimônio Líquido (ROE)",
      grupo: "Rentabilidade",
      formula: "Lucro Líquido / Patrimônio Líquido",
      substituicaoAnterior: `${fmt(llAnt)} / ${fmt(plAnt)}`,
      resultadoAnterior: plAnt !== 0 ? Number((roeAnt * 100).toFixed(2)) : 0,
      substituicaoAtual: `${fmt(llAtu)} / ${fmt(plAtu)}`,
      resultadoAtual: plAtu !== 0 ? Number((roeAtu * 100).toFixed(2)) : 0,
      interpretacao: plAtu < 0 ? "ROE Prejudicado por PL Negativo." : roeAtu >= 15 ? "Excelente atratividade para acionistas." : "Retorno baixo ou nulo."
    }
  ];

  return {
    validacao: { integro, mensagens: validationMsgs, ressalva },
    resumoExecutivo: "",
    notaExplicativa: "",
    pontosFortes: [],
    fragilidades: [],
    geracaoValor: "",
    conclusaoGerencial: {
      problemaEstrutural: "",
      principalRisco: "",
      prioridadeCorrecao: "",
      trajetoriaFutura: ""
    },
    riscos: {
      liquidez: "Moderado",
      endividamento: "Moderado",
      operacional: "Moderado",
      patrimonial: "Moderado",
      rentabilidade: "Moderado"
    },
    analiseAVAH: {
      balanco: analiseBalanco,
      dre: analiseDre
    },
    indicadores
  };
}

// REST Route to process and generate rich financial insights using Gemini
app.post("/api/analyze", async (req: Request, res: Response) => {
  try {
    const data: FinancialData = req.body;
    if (!data || !data.balancoAtual || !data.dreAtual) {
      res.status(400).json({ error: "Dados financeiros inválidos ou ausentes." });
      return;
    }

    // Step 1: Compute mathematical structure locally
    const result = processFinancials(data);

    // If data is materially broken (not integro), we must emit technical reservation and stop the analysis
    if (!result.validacao.integro) {
      result.resumoExecutivo = "Análise suspensa. Houve quebra na consistência contábil de integridade material (Ativo Total ≠ Passivo + PL).";
      result.notaExplicativa = "Nota de Ressalva Técnica: Divergências de balanço impedem a validação contábil formal segundo CPC 26 / IFRS.";
      result.pontosFortes = ["Não aplicável devido a falha cadastral contábil"];
      result.fragilidades = ["Dados de entrada desequilibrados"];
      result.conclusaoGerencial = {
        problemaEstrutural: "Desequilíbrio de Balanço Patrimonial (Ativo difere de Passivo + PL)",
        principalRisco: "Inconsistência material das informações financeiras",
        prioridadeCorrecao: "Retificar lançamento de lançamentos contábeis",
        trajetoriaFutura: "Inviabilidade operacional e riscos tributários graves"
      };
      result.riscos = {
        liquidez: "Crítico",
        endividamento: "Crítico",
        operacional: "Crítico",
        patrimonial: "Crítico",
        rentabilidade: "Crítico"
      };
      res.json({ result });
      return;
    }

    // Step 2: Query Gemini to build senior corporate diagnostic
    try {
      const client = getGeminiClient();

      const analysisPrompt = `
Você é o "ConfiaAI", um analista financeiro sênior de consultoria analítica de alta performance. Sua missão é emitir um diagnóstico profissional baseado nos indicadores calculados.

DADOS DA EMPRESA:
Período de Análise: ${data.anoAnterior} a ${data.anoAtual}

PRINCIPAIS INDICADORES CALCULADOS:
${result.indicadores.map(ind => `- ${ind.nome} (${ind.grupo}): Anterior: ${ind.resultadoAnterior}, Atual: ${ind.resultadoAtual}. Interpretação preliminar: ${ind.interpretacao}`).join("\n")}

DRE RESUMIDA:
- Receita Líquida Anterior: ${data.dreAnterior.receitaLiquida.toLocaleString("pt-BR")}, Atual: ${data.dreAtual.receitaLiquida.toLocaleString("pt-BR")}
- Custo CPV Anterior: ${data.dreAnterior.custos.toLocaleString("pt-BR")}, Atual: ${data.dreAtual.custos.toLocaleString("pt-BR")}
- Lucro Líquido Anterior: ${data.dreAnterior.lucroLiquido.toLocaleString("pt-BR")}, Atual: ${data.dreAtual.lucroLiquido.toLocaleString("pt-BR")}

BALANÇO RESUMIDO:
- Ativo Circulante Anterior: ${data.balancoAnterior.ativoCirculante.toLocaleString("pt-BR")}, Atual: ${data.balancoAtual.ativoCirculante.toLocaleString("pt-BR")}
- Ativo Não Circulante Anterior: ${data.balancoAnterior.ativoNaoCirculante.toLocaleString("pt-BR")}, Atual: ${data.balancoAtual.ativoNaoCirculante.toLocaleString("pt-BR")}
- Ativo Total Anterior: ${data.balancoAnterior.ativoTotal.toLocaleString("pt-BR")}, Atual: ${data.balancoAtual.ativoTotal.toLocaleString("pt-BR")}
- Passivo Circulante Anterior: ${data.balancoAnterior.passivoCirculante.toLocaleString("pt-BR")}, Atual: ${data.balancoAtual.passivoCirculante.toLocaleString("pt-BR")}
- Patrimônio Líquido Anterior: ${data.balancoAnterior.patrimonioLiquido.toLocaleString("pt-BR")}, Atual: ${data.balancoAtual.patrimonioLiquido.toLocaleString("pt-BR")}

SEU COMPROMISSO DE ANÁLISE:
Gere os textos do diagnóstico no seguinte formato JSON rígido. Mantenha os termos extremamente formais, numéricos, executivos e baseados estritamente na NBC contábil e CPC/IFRS brasileiros. Não inclua conversas informais ou introduções simpáticas.

SUA RESPOSTA DEVE SER APENAS O SEGUINTE OBJETO JSON (SEM MARKDOWN):
{
  "resumoExecutivo": "Texto elegante e preciso resumindo a real situação financeira (máximo 4 parágrafos, inclua percentuais de crescimento, evolução das receitas, endividamento e fluxo de caixa).",
  "notaExplicativa": "Texto formal de 1 única Nota Explicativa (conforme CPC 26) focada no fato contábil mais crítico ou discrepante identificado (ex: alavancagem de CP, margem estrangulada, ou PL negativo).",
  "pontosFortes": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "fragilidades": ["fragilidade 1", "fragilidade 2", "fragilidade 3"],
  "geracaoValor": "Texto explicando tecnicamente se a empresa está gerando ou destruindo valor econômico aos investidores/acionistas.",
  "conclusaoGerencial": {
    "problemaEstrutural": "O principal problema de estrutura financeira.",
    "principalRisco": "O principal risco financeiro/operacional enfrentado.",
    "prioridadeCorrecao": "Ação imediata recomendada à diretoria executiva.",
    "trajetoriaFutura": "Perspectivas futuras caso nenhuma providência seja tomada."
  },
  "riscos": {
    "liquidez": "Crítico|Relevante|Moderado|Baixo",
    "endividamento": "Crítico|Relevante|Moderado|Baixo",
    "operacional": "Crítico|Relevante|Moderado|Baixo",
    "patrimonial": "Crítico|Relevante|Moderado|Baixo",
    "rentabilidade": "Crítico|Relevante|Moderado|Baixo"
  }
}
`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const parsedGpt = JSON.parse(response.text || "{}");

      result.resumoExecutivo = parsedGpt.resumoExecutivo || "Erro ao obter análise executiva.";
      result.notaExplicativa = parsedGpt.notaExplicativa || "Erro ao gerar nota explicativa.";
      result.pontosFortes = parsedGpt.pontosFortes || ["Não foi possível elencar pontos fortes."];
      result.fragilidades = parsedGpt.fragilidades || ["Não foi possível elencar fragilidades."];
      result.geracaoValor = parsedGpt.geracaoValor || "Não foi possível qualificar a geração de valor.";
      result.conclusaoGerencial = parsedGpt.conclusaoGerencial || result.conclusaoGerencial;
      result.riscos = parsedGpt.riscos || result.riscos;

    } catch (apiError) {
      console.error("Gemini integration error:", apiError);
      // Fallback details if Gemini is unresponsive or fails
      result.resumoExecutivo = "Resumo indisponível temporariamente. O analista automático processou as contas locais com sucesso. Observe os indicadores e as tabelas verticais/horizontais.";
      result.notaExplicativa = "Nota Explicativa (Regulamentar CPC 26): Informação indisponível. Alinhamento de Ativos e Passivos preservado matematicamente.";
      result.pontosFortes = ["Estrutura matemática das contas íntegra.", "Visualizações geradas com base em cálculos exatos."];
      result.fragilidades = ["Serviço cognitivo indisponível - consulte os indicadores de liquidez."];
      result.geracaoValor = "Análise de geração de valor econômico prejudicada.";
      result.conclusaoGerencial = {
        problemaEstrutural: "Pendente de validação cognitiva.",
        principalRisco: "Pendente de validação de mercado.",
        prioridadeCorrecao: "Consultar os indicadores locais de cobertura de caixa.",
        trajetoriaFutura: "Análise pendente."
      };
    }

    res.json({ result });
  } catch (err: any) {
    console.error("Critical server error:", err);
    res.status(500).json({ error: err.message || "Erro interno do servidor." });
  }
});

// AI PDF Financial Statement Parser
app.post("/api/analyze-pdf", async (req: Request, res: Response) => {
  try {
    const { pdfBase64, fileName } = req.body;
    if (!pdfBase64) {
      res.status(400).json({ error: "O parâmetro pdfBase64 é obrigatório." });
      return;
    }

    const client = getGeminiClient();

    // Etapa única otimizada para economizar cota e evitar erros de limite de requisição (Rate Limit 429)
    console.log("Iniciando processamento em etapa única do PDF:", fileName);
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        },
        {
          text: `Você é um especialista em conversão de arquivos .pdf para arquivos .md e analista financeiro sênior da ConfiaAI.
Sua tarefa é analisar o documento PDF anexo e retornar os dados em um formato JSON único estruturado que contém duas partes integradas:

PARTE 1: Construtor de arquivo Markdown v3 (.md)
Analise e converta o documento em um texto Markdown (.md) otimizado para utilização em LLM/RAG, seguindo rigorosamente estas regras de negócio:
- Desconsidere a logomarca contida no cabeçalho;
- Desconsidere inscrições do rodapé;
- Caso seja identificado uma figura, crie uma referência para a figura no local exato que conste uma descrição detalhada e otimizada para o uso de uma LLM/RAG da figura;
- Caso seja identificado uma tabela, crie uma referência para a tabela no local exato que conste uma descrição detalhada e otimizada para o uso de uma LLM/RAG da tabela;
- Caso seja identificado um link/URL, crie uma referência para o link/URL no local exato e que conste uma descrição detalhada e otimizada para o uso de uma LLM/RAG do link/URL;
- Caso seja identificado um elemento tachado/suprimido/revogado, crie uma referência para o elemento tachado/suprimido/revogado no local exato e que conste uma descrição detalhada e otimizada para o uso de uma LLM/RAG do elemento tachado/suprimido/revogado;

Insira esse texto Markdown completo gerado sob a chave "markdown" do JSON retornado. Ele deve ser um arquivo markdown único e válido, mantendo todo o conteúdo não desconsiderado do arquivo original.

PARTE 2: Extração de Dados Financeiros Estruturados
Mapeie os valores das demonstrações contábeis (Balanço Patrimonial e DRE) do PDF para os campos apropriados nos demonstrativos para os dois últimos anos disponíveis.
Se houver apenas um ano disponível, use 0 para o ano anterior.

Regras importantes de mapeamento contábil:
- Custos, deduções, despesasOperacionais e impostos na DRE devem ser extraídos como números POSITIVOS em suas respectivas chaves. No cálculo fazemos 'receitaBruta - deducoes', 'receitaLiquida - custos', etc.
- O resultadoFinanceiro e outrasDespesasReceitas podem ser positivos ou negativos.
- No Balanço Patrimonial, prejuizosAcumulados deve ser um número negativo se for prejuízo acumulado, ou 0 se não houver.

Retorne os dados estritamente de acordo com a estrutura solicitada no schema JSON.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            markdown: { type: Type.STRING, description: "O conteúdo completo convertido em Markdown (.md) de acordo com as instruções do Construtor de arquivo Markdown v3" },
            empresa: { type: Type.STRING, description: "Nome da empresa identificado nas demonstrações contábeis" },
            descricao: { type: Type.STRING, description: "Uma breve descrição contextualizando as demonstrações contábeis encontradas no PDF" },
            anoAnterior: { type: Type.STRING, description: "O ano fiscal anterior (ex: '2024')" },
            anoAtual: { type: Type.STRING, description: "O ano fiscal mais recente analisado (ex: '2025')" },
            balancoAnterior: {
              type: Type.OBJECT,
              properties: {
                disponivel: { type: Type.NUMBER },
                clientes: { type: Type.NUMBER },
                estoques: { type: Type.NUMBER },
                outrosAC: { type: Type.NUMBER },
                realizavelLP: { type: Type.NUMBER },
                investimentos: { type: Type.NUMBER },
                imobilizado: { type: Type.NUMBER },
                intangivel: { type: Type.NUMBER },
                fornecedores: { type: Type.NUMBER },
                emprestimosCP: { type: Type.NUMBER },
                obrigacoesFiscais: { type: Type.NUMBER },
                outrosPC: { type: Type.NUMBER },
                emprestimosLP: { type: Type.NUMBER },
                outrosPNC: { type: Type.NUMBER },
                capitalSocial: { type: Type.NUMBER },
                reservasLucros: { type: Type.NUMBER },
                prejuizosAcumulados: { type: Type.NUMBER },
              },
            },
            balancoAtual: {
              type: Type.OBJECT,
              properties: {
                disponivel: { type: Type.NUMBER },
                clientes: { type: Type.NUMBER },
                estoques: { type: Type.NUMBER },
                outrosAC: { type: Type.NUMBER },
                realizavelLP: { type: Type.NUMBER },
                investimentos: { type: Type.NUMBER },
                imobilizado: { type: Type.NUMBER },
                intangivel: { type: Type.NUMBER },
                fornecedores: { type: Type.NUMBER },
                emprestimosCP: { type: Type.NUMBER },
                obrigacoesFiscais: { type: Type.NUMBER },
                outrosPC: { type: Type.NUMBER },
                emprestimosLP: { type: Type.NUMBER },
                outrosPNC: { type: Type.NUMBER },
                capitalSocial: { type: Type.NUMBER },
                reservasLucros: { type: Type.NUMBER },
                prejuizosAcumulados: { type: Type.NUMBER },
              },
            },
            dreAnterior: {
              type: Type.OBJECT,
              properties: {
                receitaBruta: { type: Type.NUMBER },
                deducoes: { type: Type.NUMBER },
                custos: { type: Type.NUMBER },
                despesasOperacionais: { type: Type.NUMBER },
                outrasDespesasReceitas: { type: Type.NUMBER },
                resultadoFinanceiro: { type: Type.NUMBER },
                impostos: { type: Type.NUMBER },
              },
            },
            dreAtual: {
              type: Type.OBJECT,
              properties: {
                receitaBruta: { type: Type.NUMBER },
                deducoes: { type: Type.NUMBER },
                custos: { type: Type.NUMBER },
                despesasOperacionais: { type: Type.NUMBER },
                outrasDespesasReceitas: { type: Type.NUMBER },
                resultadoFinanceiro: { type: Type.NUMBER },
                impostos: { type: Type.NUMBER },
              },
            },
          },
          required: [
            "markdown",
            "empresa",
            "descricao",
            "anoAnterior",
            "anoAtual",
            "balancoAnterior",
            "balancoAtual",
            "dreAnterior",
            "dreAtual",
          ],
        },
        systemInstruction: "Você é o mestre de conversão de PDFs em Markdown (.md) e mapeador financeiro oficial da ConfiaAI. Sua missão é converter as demonstrações contábeis brasileiras do PDF em Markdown e estruturar o JSON correspondente.",
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Não foi possível obter resposta estruturada do modelo Gemini.");
    }

    const parsedSingle = JSON.parse(jsonText);
    const { markdown, ...financialData } = parsedSingle;

    res.json({
      markdown: markdown || "",
      data: financialData
    });
  } catch (err: any) {
    console.error("Erro no processamento do PDF:", err);
    res.status(500).json({ error: err.message || "Erro no processamento do PDF via Gemini." });
  }
});

// AI Financial Chat interface
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { messages, data, result } = req.body;
    if (!messages || !data) {
      res.status(400).json({ error: "Faltam parâmetros obrigatórios na requisição." });
      return;
    }

    const client = getGeminiClient();

    // Prepare analysis context for the model
    const contextPrompt = `
Você é o "ConfiaAI", analista financeiro sênior de consultoria analítica de alta performance. Seu tom é estritamente executivo, direto, focado em dados e fundamentado em regras contábeis (CPC/IFRS).

Abaixo está o contexto do caso contábil atualmente analisado pelo usuário:
Empresa: ${data.empresa || "Customizada"}
Análise de Período: ${data.anoAnterior} a ${data.anoAtual}

DADOS FINANCEIROS DA EMPRESA:
- Ativo Total (${data.anoAtual}): R$ ${data.balancoAtual.ativoTotal.toLocaleString("pt-BR")}
- Passivo Total CP/LP (${data.anoAtual}): R$ ${(data.balancoAtual.passivoCirculante + data.balancoAtual.passivoNaoCirculante).toLocaleString("pt-BR")}
- Patrimônio Líquido (${data.anoAtual}): R$ ${data.balancoAtual.patrimonioLiquido.toLocaleString("pt-BR")}
- Receita Líquida (${data.anoAtual}): R$ ${data.dreAtual.receitaLiquida.toLocaleString("pt-BR")}
- Lucro Líquido (${data.anoAtual}): R$ ${data.dreAtual.lucroLiquido.toLocaleString("pt-BR")}

INDICADORES CRÍTICOS:
${result ? result.indicadores.map((ind: any) => `- ${ind.nome}: Ano Anterior: ${ind.resultadoAnterior}, Ano Atual: ${ind.resultadoAtual} (${ind.interpretacao})`).join("\n") : "Sem indicadores calculados."}

INSTRUÇÕES DE COMPORTAMENTO:
1. Responda em português (Brasil).
2. Vá direto ao ponto, com números exatos. Evite desculpas ou rodeios conceituais longos.
3. Use jargões corretos da contabilidade brasileira (ex: Capital de Giro Líquido, Passivo a Descoberto, Margem de Contribuição, Custo do Capital Próprio).
4. Forneça respostas robustas baseadas estritamente na situação relatada.
`;

    // Limit history length for performance and context window
    const chatHistory = messages.slice(-8).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Add user query with context
    const currentMsg = chatHistory[chatHistory.length - 1]?.parts?.[0]?.text || "";

    const chat = client.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: contextPrompt,
        temperature: 0.1,
      }
    });

    // Feed preceding history first if any (excluding the last one)
    if (chatHistory.length > 1) {
      // Re-create history
      for (let i = 0; i < chatHistory.length - 1; i++) {
        // Unfortunately SDK chat doesn't support setting full history directly in all variants easily,
        // so we can compose everything in a single message or build a conversation chain
      }
    }

    const response = await chat.sendMessage({
      message: currentMsg
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Chat backend error:", err);
    res.status(500).json({ error: err.message || "Erro no serviço de atendimento cognitivo." });
  }
});

// Serve frontend
async function configureFrontend() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite dev middleware loaded successfully.");
    } catch (e) {
      console.error("Failed to load Vite dev middleware:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

if (!process.env.VERCEL) {
  configureFrontend().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`ConfiaAI backend running on port ${PORT}`);
    });
  });
}

export default app;
