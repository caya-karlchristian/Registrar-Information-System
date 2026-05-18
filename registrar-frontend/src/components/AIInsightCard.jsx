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

  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className={`border rounded-4xl shadow-sm p-6 space-y-4 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-slate-200 bg-white'}`}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-[#3a3b3c]' : 'bg-red-50'}`}>
            <SparklesIcon className={`w-5 h-5 ${isDark ? 'text-white' : 'text-[#800000]'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#800000]'}`}>
              AI Insights
            </h2>
            {formattedTime && (
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>
                Generated {formattedTime}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {narrative && (
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${isDark ? 'border-[#4e4f50] text-[#b0b3b8] hover:bg-[#3a3b3c]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
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
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide shadow transition-colors ${isDark ? 'bg-[#3a3b3c] text-white hover:bg-[#4e4f50]' : 'bg-[#800000] text-white hover:bg-[#6b0000]'} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            {loading ? 'Generating…' : narrative ? 'Regenerate' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className={`flex items-start gap-3 border rounded-2xl p-4 ${isDark ? 'bg-red-950/30 border-red-900/50' : 'bg-red-50 border-red-100'}`}>
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>Failed to generate report</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && narrative && (
        <div className={`prose prose-sm max-w-none leading-relaxed text-sm space-y-3 ${isDark ? 'text-[#b0b3b8]' : 'text-slate-700'}`}>
          {narrative.split('\n\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
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
  return (
    <div className="space-y-3 animate-pulse">
      {[100, 90, 95, 80, 85].map((w, i) => (
        <div key={i} className={`h-3 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-slate-100'}`} style={{ width: `${w}%` }} />
      ))}
      <div className={`h-3 rounded-full w-1/2 ${isDark ? 'bg-[#3a3b3c]' : 'bg-slate-100'}`} />
    </div>
  );
};

export default AIInsightCard;
