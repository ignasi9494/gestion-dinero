import { create } from "zustand";

export type AIModel = "gpt-4o-mini" | "gpt-4o" | "o3-mini";

export interface AIModelOption {
  id: AIModel;
  label: string;
  description: string;
  icon: string;
  costLabel: string;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: "gpt-4o-mini",
    label: "Rapido",
    description: "Respuestas rapidas y economicas",
    icon: "⚡",
    costLabel: "~0.03c/msg",
  },
  {
    id: "gpt-4o",
    label: "Inteligente",
    description: "Mejor comprension y analisis",
    icon: "🧠",
    costLabel: "~0.3c/msg",
  },
  {
    id: "o3-mini",
    label: "Premium",
    description: "Razonamiento avanzado",
    icon: "💎",
    costLabel: "~1c/msg",
  },
];

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  richData?: RichData | null;
  suggestedActions?: SuggestedAction[];
  modelUsed?: string;
  timestamp: string;
}

export interface RichData {
  type: "chart" | "highlight" | "table" | "category-breakdown";
  chartType?: "bar" | "pie" | "line";
  data?: any[];
  xKey?: string;
  yKey?: string;
  items?: { label: string; value: string | number; trend?: "up" | "down" }[];
  payload?: any;
}

export interface SuggestedAction {
  label: string;
  message: string;
}

interface AssistantStore {
  isOpen: boolean;
  messages: AssistantMessage[];
  isLoading: boolean;
  hasUnreadInsight: boolean;
  selectedModel: AIModel;

  open: () => void;
  close: () => void;
  toggle: () => void;
  addMessage: (msg: AssistantMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setUnreadInsight: (has: boolean) => void;
  setModel: (model: AIModel) => void;
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  hasUnreadInsight: false,
  selectedModel: "gpt-4o-mini",

  open: () => set({ isOpen: true, hasUnreadInsight: false }),
  close: () => set({ isOpen: false }),
  toggle: () =>
    set((s) => ({
      isOpen: !s.isOpen,
      hasUnreadInsight: s.isOpen ? s.hasUnreadInsight : false,
    })),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
  setUnreadInsight: (has) => set({ hasUnreadInsight: has }),
  setModel: (model) => set({ selectedModel: model }),
}));
