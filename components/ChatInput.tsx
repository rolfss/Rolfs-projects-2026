"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const msg = value.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div
        className={`flex items-end gap-2 border bg-white transition-colors ${
          disabled
            ? "border-slate-200 opacity-60"
            : "border-slate-300 focus-within:border-slate-500"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="Still et spørsmål om NOARK 5 eller arkivregelverket…"
          rows={3}
          className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none"
          aria-label="Skriv spørsmål"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send melding"
          className={`m-2 flex-shrink-0 w-8 h-8 flex items-center justify-center transition-colors ${
            disabled || !value.trim()
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-slate-800 text-white hover:bg-slate-700"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>
      <p className="text-xs text-slate-400 text-center">
        Enter for å sende · Shift+Enter for ny linje
      </p>
    </form>
  );
}
