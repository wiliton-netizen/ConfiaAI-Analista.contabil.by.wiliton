import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  HelpCircle, 
  Cpu, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { ChatMessage, FinancialData, DiagnosticResult } from "../types";

interface ChatTabProps {
  data: FinancialData;
  result: DiagnosticResult | null;
  empresa: string;
}

export default function ChatTab({ data, result, empresa }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: `Olá! Sou o **ConfiaAI**, seu analista financeiro corporativo sênior. 

Já processei os demonstrativos da **${empresa}** de ${data.anoAnterior} e ${data.anoAtual}. Estou pronto para discutir detalhes de liquidez, estrutura de capital, rentabilidade operacional e avaliar cenários de fluxo de caixa ou de insolvência. 

Em que posso te ajudar hoje? Selecione uma das perguntas sugeridas abaixo ou digite sua dúvida.`
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Suggested quick questions
  const quickPills = [
    "Qual o principal problema de giro da empresa?",
    "A estrutura de endividamento de curto prazo é sustentável?",
    "O que provocou a variação do lucro líquido?",
    "De acordo com o CPC 26, quais as principais ressalvas do balanço?",
    "Como podemos melhorar o retorno dos acionistas (ROE)?"
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setError(null);
    const userMsg: ChatMessage = { role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          data: {
            empresa,
            anoAnterior: data.anoAnterior,
            anoAtual: data.anoAtual,
            balancoAtual: data.balancoAtual,
            balancoAnterior: data.balancoAnterior,
            dreAtual: data.dreAtual,
            dreAnterior: data.dreAnterior
          },
          result
        }),
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com o serviço cognitivo ConfiaAI.");
      }

      const reply = await response.json();
      setMessages((prev) => [...prev, { role: "model", text: reply.text || "Sem resposta." }]);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Houve uma falha no microsserviço.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col h-[calc(100vh-170px)] min-h-[500px]" id="chat-tab-workspace">
      
      {/* Bot Identity Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            C
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 font-display flex items-center gap-1">
              ConfiaAI Finance Specialist
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Modo de Alta Precisão (NBC/CPC) Ativo</span>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-sm">
          ONLINE
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 text-xs leading-relaxed select-text">
        {messages.map((msg, i) => {
          const isModel = msg.role === "model";
          return (
            <div key={i} className={`flex items-start gap-2.5 ${isModel ? "" : "flex-row-reverse"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isModel ? "bg-slate-900 text-white" : "bg-blue-600 text-white"}`}>
                {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              
              <div className={`p-3.5 rounded-lg max-w-[85%] border shadow-xs ${isModel ? "bg-slate-50 border-slate-200 text-slate-900 font-medium" : "bg-blue-600 text-white border-blue-500"}`}>
                <div className="whitespace-pre-wrap leading-relaxed font-sans prose prose-sm prose-slate select-text">
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg text-slate-400 font-mono font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
              <Cpu className="w-3.5 h-3.5 animate-spin text-slate-400" />
              ConfiaAI formulando parecer técnico...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11px] p-3 rounded-lg flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={chatEndRef}></div>
      </div>

      {/* Quick suggestions pills */}
      <div className="mb-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          Sugestões de Análise do Especialista:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {quickPills.map((pill, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(pill)}
              disabled={loading}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-full border border-slate-200 transition-all cursor-pointer truncate max-w-full"
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Message input control */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage(inputText);
          }}
          placeholder="Pergunte ao ConfiaAI sobre o endividamento, liquidez ou margens..."
          className="flex-1 text-xs text-slate-950 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 hover:border-slate-300 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950 focus:border-slate-950 transition-all font-sans"
        />
        <button
          onClick={() => handleSendMessage(inputText)}
          disabled={loading || !inputText.trim()}
          className="bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 text-white p-2.5 rounded-lg transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
