import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { SparklesIcon, ClipboardDocumentIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * AIInsightCard
 *
 * Displays the Claude-generated narrative returned by POST /analytics/ai-report.
 *
 * Props:
 *  narrative   string | null   — the AI text (null = not yet generated)
 *  loading     bool            — show skeleton while fetching
 *  error       string | null   — error message if the call failed
 *  onGenerate  () => void      — called when the user clicks "Generate"
 *  generatedAt string | null   — ISO timestamp from the API response
 */
const AIInsightCard = ({ narrative, loading, error, onGenerate, generatedAt }) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!narrative) return;
    navigator.clipboard.writeText(narrative).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderInline = (text, isDark) =>
  text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className={`font-semibold ${isDark ? 'text-white' : 'text-[#800000]'}`}>{part}</strong>
      : part
  );

  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
      <div className={`border rounded-2xl shadow-sm overflow-hidden ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-slate-200 bg-white'}`}>
        
        <div className={`px-6 py-4 flex items-center gap-3 ${isDark ? 'bg-[#3a3b3c]' : 'bg-[#800000]'}`}>
          <div className="p-2 rounded-lg bg-white/10">
            <SparklesIcon className={`w-7 h-7 ${isDark ? 'text-white' : 'text-slate-100'}`} />          
          </div>
          <div>
            <h2 className={`text-lg font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-white'}`}>
              AI Insights
            </h2>
            {formattedTime && (
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#9a9a9a]' : 'text-slate-100'}`}>
                Generated {formattedTime}
              </p>
            )}
          </div>

        <div className="flex items-center gap-2 justify-end ml-auto ">
          {narrative && (
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs 
                font-bold transition-colors 
                ${isDark ? 'border-[#4e4f50] text-[#b0b3b8] hover:bg-[#7e7e7e75]' 
                  : 'border-slate-100 text-white bg-white/10 hover:bg-slate-900/10'}`}
            >
              {copied
                ? <><CheckIcon className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Copied</span></>
                : <><ClipboardDocumentIcon className="w-3.5 h-3.5" /><span>Copy</span></>
              }
            </button>
          )}
          <button
            onClick={onGenerate}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-xs 
              font-black uppercase tracking-wide transition-colors 
              ${isDark ? 'border-[#4e4f50] text-[#b0b3b8] hover:bg-[#7e7e7e75]' 
                : 'border-slate-100 text-white bg-white/10 hover:bg-slate-900/10'} 
                disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            {loading ? 'Generating…' : narrative ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className={`flex items-start gap-3 border rounded-2xl p-4 
        ${isDark ? 'bg-red-950/30 border-red-900/50' 
        : 'bg-red-50 border-red-100'}`}>
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>Failed to generate report</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && narrative && (
      <div className="max-w-3xl mx-auto mt-3">
        <div
          className={`
            relative overflow-hidden rounded-2xl border shadow-sm
            ${isDark ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-slate-200"}
          `}
        >
          {/* Header Accent */}
          <div className="h-1 bg-linear-to-r from-[#800000] via-[#a52a2a] to-[#800000]" />

          {/* Content */}
          <div className="p-4 md:p-6">
            {narrative.split("\n").map((line, i) => {
              if (
                line.includes("Registrar Analytics Report") ||
                line.startsWith("# ")
              )
                return null;

              if (line.startsWith("## ")) {
                return (
                  <div key={i} className="mt-6 first:mt-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-5 rounded-full bg-[#800000]" />
                      <h3 className="text-base font-bold text-[#800000]">
                        {line.replace("## ", "")}
                      </h3>
                    </div>
                  </div>
                );
              }

              const processedLine = line.replace(
                /\*\*(.*?)\*\*/g,
                `<strong class="font-semibold ${
                  isDark ? "text-white" : "text-slate-900"
                }">$1</strong>`
              );

              if (line.trim().startsWith("- ")) {
                return (
                  <div key={i} className="flex gap-2 mb-2">
                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[#800000]" />
                    <div
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: line.replace("- ", ""),
                      }}
                    />
                  </div>
                );
              }

              return line.trim() ? (
                <p
                  key={i}
                  className="text-sm leading-6 mb-3"
                  dangerouslySetInnerHTML={{ __html: processedLine }}
                />
              ) : (
                <div key={i} className="h-1.5" />
              );
            })}
          </div>
        </div>

        <div className="h-6" />
      </div>
    )}

      {!loading && !error && !narrative && (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
          <div className={`p-4 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-slate-50'}`}>
            <SparklesIcon className={`w-8 h-8 ${isDark ? 'text-[#4e4f50]' : 'text-slate-300'}`} />
          </div>
          <p className={`text-sm font-bold ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>No report generated yet</p>
          <p className={`text-xs max-w-xs ${isDark ? 'text-[#9a9a9a]' : 'text-slate-300'}`}>
            Click <span className={`font-black ${isDark ? 'text-white' : 'text-[#800000]'}`}>Generate Report</span> to get
            an AI-written narrative of the current analytics data.
          </p>
        </div>
      )}
    </div>
  );
};

const LoadingSkeleton = () => {
  const { isDark } = useTheme();
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-200';
  
  return (
    <div className="max-w-3xl mx-auto mt-3 animate-pulse">
      <div className={`rounded-2xl border ${isDark ? 'border-[#333]' : 'border-slate-200'} p-6 space-y-6`}>
        
        {/* Header Skeleton */}
        <div className="space-y-3 border-b pb-6 border-slate-100">
          <div className={`h-6 w-3/4 rounded ${bg}`} />
          <div className={`h-3 w-1/2 rounded ${bg}`} />
        </div>

        {/* Section 1 Skeleton */}
        <div className="space-y-3">
          <div className={`h-4 w-1/4 rounded-full ${bg}`} />
          <div className={`h-3 w-full rounded ${bg}`} />
          <div className={`h-3 w-full rounded ${bg}`} />
          <div className={`h-3 w-4/5 rounded ${bg}`} />
        </div>

        {/* Section 2 Skeleton */}
        <div className="space-y-3">
          <div className={`h-4 w-1/4 rounded-full ${bg}`} />
          <div className={`h-3 w-full rounded ${bg}`} />
          <div className={`h-3 w-full rounded ${bg}`} />
          <div className={`h-3 w-3/4 rounded ${bg}`} />
        </div>
      </div>
    </div>
  );
};

export default AIInsightCard;
