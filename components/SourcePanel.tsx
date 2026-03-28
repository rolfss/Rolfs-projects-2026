"use client";

import { Source } from "@/types";

interface SourcePanelProps {
  sources: Source[];
}

export default function SourcePanel({ sources }: SourcePanelProps) {
  if (sources.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-end pb-2">
        <p className="text-xs text-slate-400 text-center italic">
          Kilder vises her etter hvert svar
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
        Kilder
      </h3>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.id}>
            <SourceCard source={source} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  const hasLink = !!source.url;

  const meta = [
    source.page ? `Side ${source.page}` : null,
    source.section ? `Avsnitt ${source.section}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const content = (
    <div className="group p-3 bg-slate-50 border border-slate-200 rounded hover:border-slate-400 hover:bg-white transition-all duration-150">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-700 leading-tight truncate">
            {source.document}
          </p>
          {meta && (
            <p className="text-xs text-slate-400 mt-0.5">{meta}</p>
          )}
          {source.quote && (
            <p className="text-xs text-slate-500 mt-1.5 italic leading-relaxed line-clamp-2">
              «{source.quote}»
            </p>
          )}
        </div>
        {hasLink && (
          <span className="flex-shrink-0 text-slate-300 group-hover:text-slate-500">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );

  if (hasLink) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title={`Åpne ${source.document}`}
      >
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}
