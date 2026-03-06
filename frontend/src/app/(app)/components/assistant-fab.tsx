"use client";

import { Sparkles } from "lucide-react";
import { useAssistantStore } from "@/lib/stores/assistant-store";

export function AssistantFAB() {
  const { toggle, hasUnreadInsight, isOpen } = useAssistantStore();

  if (isOpen) return null;

  return (
    <button
      onClick={toggle}
      className={`fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/40 active:scale-95 md:bottom-6 md:right-6 ${
        hasUnreadInsight ? "assistant-pulse" : ""
      } gradient-primary fab-safe`}
      aria-label="Abrir asistente financiero"
    >
      <Sparkles className="h-6 w-6 text-white" />
      {hasUnreadInsight && (
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
      )}
    </button>
  );
}
