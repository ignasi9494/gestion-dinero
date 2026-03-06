"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  X,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  TrendingDown,
  Bot,
  User,
  ChevronDown,
} from "lucide-react";
import { useAssistant } from "@/lib/hooks/useAssistant";
import { useAssistantStore } from "@/lib/stores/assistant-store";
import type {
  AssistantMessage,
  RichData,
  SuggestedAction,
} from "@/lib/stores/assistant-store";
import { AI_MODELS, type AIModel } from "@/lib/stores/assistant-store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#a855f7",
];

const QUICK_ACTIONS: SuggestedAction[] = [
  {
    label: "📊 Resumen del mes",
    message: "Dame un resumen de mis gastos de este mes",
  },
  {
    label: "💸 Mayor gasto",
    message: "Cual fue mi gasto mas grande este mes?",
  },
  {
    label: "🍽️ Restaurantes",
    message: "Cuanto he gastado en restaurantes este mes?",
  },
  {
    label: "📈 Vs mes anterior",
    message: "Compara mis gastos de este mes con el anterior",
  },
  {
    label: "💰 Ahorro",
    message: "Cuanto estoy ahorrando al mes de media?",
  },
  {
    label: "📉 Tendencias",
    message: "Que tendencias ves en mis gastos de los ultimos 6 meses?",
  },
  {
    label: "🔄 Suscripciones",
    message: "Cuanto gasto en suscripciones al mes?",
  },
];

// --- Rich Response Components ---

function MiniBarChart({ data, xKey, yKey }: { data: any[]; xKey: string; yKey: string }) {
  return (
    <div className="my-2 rounded-xl bg-white/80 p-3 shadow-sm">
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            formatter={(v: number) =>
              new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(v)
            }
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          />
          <Bar dataKey={yKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniPieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="my-2 rounded-xl bg-white/80 p-3 shadow-sm">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={55}
            innerRadius={30}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) =>
              new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(v)
            }
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "none" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-2">
        {data.slice(0, 5).map((d, i) => (
          <span key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function HighlightCards({
  items,
}: {
  items: { label: string; value: string | number; trend?: "up" | "down" }[];
}) {
  return (
    <div className="my-2 grid grid-cols-2 gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl bg-white/80 p-3 shadow-sm"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-base font-bold text-foreground">
              {typeof item.value === "number"
                ? new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  }).format(item.value)
                : item.value}
            </span>
            {item.trend === "up" && (
              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
            )}
            {item.trend === "down" && (
              <TrendingDown className="h-3.5 w-3.5 text-green-500" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RichDataRenderer({ data }: { data: RichData }) {
  if (data.type === "chart" && data.data) {
    if (data.chartType === "pie") {
      return <MiniPieChart data={data.data} />;
    }
    return (
      <MiniBarChart
        data={data.data}
        xKey={data.xKey || "name"}
        yKey={data.yKey || "value"}
      />
    );
  }
  if (data.type === "highlight" && data.items) {
    return <HighlightCards items={data.items} />;
  }
  return null;
}

// --- Model Selector ---

function ModelSelector({
  selectedModel,
  onSelect,
}: {
  selectedModel: AIModel;
  onSelect: (model: AIModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = AI_MODELS.find((m) => m.id === selectedModel) ?? AI_MODELS[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
      >
        <span>{current.icon}</span>
        <span>{current.label}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {AI_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onSelect(model.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent ${
                model.id === selectedModel ? "bg-primary/5" : ""
              }`}
            >
              <span className="text-base">{model.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {model.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {model.costLabel}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {model.description}
                </p>
              </div>
              {model.id === selectedModel && (
                <span className="text-primary text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Message Bubble ---

function MessageBubble({ msg }: { msg: AssistantMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-primary/10 text-primary"
            : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-primary/10 text-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {msg.content}
        </p>
        {msg.richData && <RichDataRenderer data={msg.richData} />}
      </div>
    </div>
  );
}

// --- Typing Indicator ---

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl bg-muted px-4 py-3">
        <div className="flex gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
        </div>
      </div>
    </div>
  );
}

// --- Welcome Screen ---

function WelcomeScreen({
  onAction,
}: {
  onAction: (msg: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-lg font-bold text-foreground">
        Hola! Soy tu asistente financiero
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Puedo ayudarte a entender tus gastos, encontrar patrones y gestionar tu
        dinero.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {QUICK_ACTIONS.slice(0, 4).map((action) => (
          <button
            key={action.label}
            onClick={() => onAction(action.message)}
            className="rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md active:scale-95"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Main Panel ---

export function AssistantPanel() {
  const { messages, isLoading, sendMessage, clearMessages, selectedModel, setModel } = useAssistant();
  const { isOpen, close } = useAssistantStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleChipAction = (message: string) => {
    sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  // Get the last assistant message's suggested actions
  const lastAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const dynamicActions = lastAssistantMsg?.suggestedActions || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity md:bg-black/20"
        onClick={close}
      />

      {/* Panel */}
      <div
        className={`fixed z-50 flex flex-col bg-card shadow-2xl
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl animate-slide-up
          md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[420px] md:max-h-full md:rounded-none md:border-l md:border-border md:animate-slide-in-right`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Asistente Financiero
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Preguntame sobre tus gastos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ModelSelector selectedModel={selectedModel} onSelect={setModel} />
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Limpiar chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={close}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drag handle (mobile) */}
        <div className="flex justify-center py-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <WelcomeScreen onAction={handleChipAction} />
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick Actions (after messages) */}
        {messages.length > 0 && !isLoading && (
          <div className="border-t border-border/50 px-4 py-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {(dynamicActions.length > 0
                ? dynamicActions
                : QUICK_ACTIONS.slice(0, 4)
              ).map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleChipAction(action.message)}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground active:scale-95"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border px-4 py-3 pb-safe"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre tus gastos..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ maxHeight: 100 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40 gradient-primary shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 active:scale-95"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
