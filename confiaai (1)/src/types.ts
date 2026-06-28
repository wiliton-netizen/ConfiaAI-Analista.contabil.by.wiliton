export interface BalanceSheetPeriod {
  // Ativo Circulante
  disponivel: number;
  clientes: number;
  estoques: number;
  outrosAC: number;
  ativoCirculante: number; // calculated or inputted

  // Ativo Não Circulante
  realizavelLP: number;
  investimentos: number;
  imobilizado: number;
  intangivel: number;
  ativoNaoCirculante: number; // calculated or inputted

  ativoTotal: number; // calculated

  // Passivo Circulante
  fornecedores: number;
  emprestimosCP: number;
  obrigacoesFiscais: number;
  outrosPC: number;
  passivoCirculante: number; // calculated or inputted

  // Passivo Não Circulante
  emprestimosLP: number;
  outrosPNC: number;
  passivoNaoCirculante: number; // calculated or inputted

  // Patrimônio Líquido
  capitalSocial: number;
  reservasLucros: number;
  prejuizosAcumulados: number;
  patrimonioLiquido: number; // calculated or inputted

  passivoTotalPL: number; // calculated (Passivo Circulante + Passivo Não Circulante + PL)
}

export interface DrePeriod {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number; // base for AV
  custos: number; // CPV/CSP
  lucroBruto: number;
  despesasOperacionais: number;
  outrasDespesasReceitas: number;
  ebit: number; // lucro operacional
  resultadoFinanceiro: number;
  lair: number;
  impostos: number;
  lucroLiquido: number;
}

export interface FinancialData {
  anoAnterior: string; // e.g., "2024"
  anoAtual: string; // e.g., "2025"
  balancoAnterior: BalanceSheetPeriod;
  balancoAtual: BalanceSheetPeriod;
  dreAnterior: DrePeriod;
  dreAtual: DrePeriod;
}

export interface IndicatorRow {
  nome: string;
  grupo: "Liquidez" | "Estrutura" | "Rentabilidade";
  formula: string;
  substituicaoAnterior: string;
  resultadoAnterior: number;
  substituicaoAtual: string;
  resultadoAtual: number;
  interpretacao: string;
}

export interface DiagnosticResult {
  validacao: {
    integro: boolean;
    mensagens: string[];
    ressalva: string | null;
  };
  resumoExecutivo: string;
  notaExplicativa: string;
  pontosFortes: string[];
  fragilidades: string[];
  geracaoValor: string;
  conclusaoGerencial: {
    problemaEstrutural: string;
    principalRisco: string;
    prioridadeCorrecao: string;
    trajetoriaFutura: string;
  };
  riscos: {
    liquidez: "Crítico" | "Relevante" | "Moderado" | "Baixo";
    endividamento: "Crítico" | "Relevante" | "Moderado" | "Baixo";
    operacional: "Crítico" | "Relevante" | "Moderado" | "Baixo";
    patrimonial: "Crítico" | "Relevante" | "Moderado" | "Baixo";
    rentabilidade: "Crítico" | "Relevante" | "Moderado" | "Baixo";
  };
  analiseAVAH: {
    balanco: {
      conta: string;
      anteriorValor: number;
      anteriorAV: number;
      atualValor: number;
      atualAV: number;
      varAH: number;
    }[];
    dre: {
      conta: string;
      anteriorValor: number;
      anteriorAV: number;
      atualValor: number;
      atualAV: number;
      varAH: number;
    }[];
  };
  indicadores: IndicatorRow[];
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}
