"use client";

import { Message } from "@/types";
import { useEffect, useRef } from "react";

interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
}

export default function ChatHistory({
  messages,
  isLoading,
}: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div className="w-12 h-12 bg-slate-100 flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-slate-400"
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
        <h2 className="text-base font-semibold text-slate-700 mb-1">
          NOARK 5 Arkivassistent
        </h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Spør om NOARK 5-standarden, arkivforskriften eller arkivloven.
          Alle svar er forankret i kildedokumentene.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-sm">
          {EXAMPLE_QUESTIONS.map((q) => (
            <div
              key={q}
              className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 text-left"
            >
              {q}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? "bg-slate-800 text-white"
            : "bg-white border border-slate-200 text-slate-800"
        } px-4 py-3`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Assistent
            </span>
          </div>
        )}
        <div
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            isUser ? "text-white" : "text-slate-800"
          }`}
        >
          <FormattedContent content={message.content} />
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {message.sources.length} kilde
              {message.sources.length !== 1 ? "r" : ""} sitert
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Render bold markers and preserve line breaks
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          <InlineFormatted text={line} />
        </span>
      ))}
    </>
  );
}

function InlineFormatted({ text }: { text: string }) {
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-slate-200 px-4 py-3">
        <div className="flex items-center gap-1 h-4">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

const EXAMPLE_QUESTIONS = [
  "Hva er NOARK 5-standarden?",
  "Hvilke krav stilles til journalføring?",
  "Hvordan håndteres kassasjon etter arkivloven?",
];
