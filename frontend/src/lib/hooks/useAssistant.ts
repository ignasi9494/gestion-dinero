import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  useAssistantStore,
  type AssistantMessage,
} from "@/lib/stores/assistant-store";

export function useAssistant() {
  const {
    messages,
    isLoading,
    isOpen,
    addMessage,
    setLoading,
    open,
    close,
    toggle,
    clearMessages,
  } = useAssistantStore();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Add user message
      const userMsg: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      setLoading(true);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("No authenticated session");
        }

        // Build conversation history (last 10 messages)
        const currentMessages = useAssistantStore.getState().messages;
        const history = currentMessages.slice(-11, -1).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/financial-assistant`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            },
            body: JSON.stringify({
              message: text.trim(),
              conversationHistory: history,
              userId: session.user.id,
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${response.status}`);
        }

        const data = await response.json();

        const assistantMsg: AssistantMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply || "No he podido obtener una respuesta.",
          richData: data.richData || null,
          suggestedActions: data.suggestedActions || [],
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMsg);
      } catch (err: any) {
        const errorMsg: AssistantMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Lo siento, ha ocurrido un error: ${err.message}. Intentalo de nuevo.`,
          timestamp: new Date().toISOString(),
        };
        addMessage(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [isLoading, addMessage, setLoading]
  );

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    open,
    close,
    toggle,
    clearMessages,
  };
}
