"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function extractSessionId(pathname: string): string | null {
  if (pathname.startsWith("/session/")) {
    return pathname.replace("/session/", "").split("/")[0] ?? null;
  }
  if (pathname.startsWith("/results/")) {
    return pathname.replace("/results/", "").split("/")[0] ?? null;
  }
  return null;
}

export function AstraeaChatbot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I can help you break down interview problems into classes, APIs, and implementation steps. Open a session page for context-aware guidance.",
    },
  ]);

  const sessionId = useMemo(() => extractSessionId(pathname), [pathname]);
  const disabled = !sessionId;

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      if (!sessionId) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Open a specific session first, then I can give guidance tied to that prompt.",
          },
        ]);
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: trimmed,
          history: nextHistory,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");
      const data = (await response.json()) as { message: string };
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I hit an error. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-88 rounded-2xl border border-neutral-700 bg-neutral-950/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Astraea Coach</p>
              <p className="text-xs text-neutral-400">
                {sessionId ? `Session ${sessionId.slice(0, 8)}` : "No active session context"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              Close
            </button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  message.role === "assistant"
                    ? "bg-neutral-900 text-neutral-200"
                    : "bg-cyan-300/15 text-cyan-100"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-800 p-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                disabled ? "Open a session to ask contextual questions..." : "Ask for a hint..."
              }
              disabled={disabled || loading}
              className="h-20 w-full resize-none rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={send}
              disabled={disabled || loading || !input.trim()}
              className="mt-2 w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-neutral-700 bg-neutral-950/90 px-4 py-3 text-sm font-medium text-white shadow-xl backdrop-blur hover:bg-neutral-900"
        >
          Open Coach
        </button>
      )}
    </div>
  );
}
