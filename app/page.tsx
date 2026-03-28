"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatHistory from "@/components/ChatHistory";
import ChatInput from "@/components/ChatInput";
import SourcePanel from "@/components/SourcePanel";
import { Message, Source } from "@/types";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: userText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            userMessage: userText,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: data.message,
          sources: data.sources,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentSources(data.sources ?? []);
      } catch {
        const errorMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content:
            "Beklager, det oppstod en feil. Vennligst prøv igjen.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-slate-800 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-800 leading-tight">
                NOARK 5 Arkivassistent
              </h1>
              <p className="text-xs text-slate-400 leading-tight">
                Basert på NOARK 5, Arkivloven og Arkivforskriften
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            <span className="text-xs text-slate-400">RAG aktivert</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 overflow-hidden max-w-screen-xl w-full mx-auto flex gap-0">
        {/* Left: Chat history */}
        <main className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
          <ChatHistory messages={messages} isLoading={isLoading} />
        </main>

        {/* Right: Sources + Input */}
        <aside className="w-80 flex-shrink-0 flex flex-col bg-slate-50 overflow-hidden">
          {/* Sources section */}
          <div className="flex-1 overflow-hidden flex flex-col p-4 border-b border-slate-200">
            <SourcePanel sources={currentSources} />
          </div>

          {/* Input section */}
          <div className="p-4 bg-white">
            <ChatInput onSend={sendMessage} disabled={isLoading} />
          </div>
        </aside>
      </div>
    </div>
  );
}
