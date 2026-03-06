import { create } from "zustand";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  richData?: RichData | null;
  suggestedActions?: SuggestedAction[];
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

  open: () => void;
  close: () => void;
  toggle: () => void;
  addMessage: (msg: AssistantMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setUnreadInsight: (has: boolean) => void;
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  hasUnreadInsight: false,

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
}));
