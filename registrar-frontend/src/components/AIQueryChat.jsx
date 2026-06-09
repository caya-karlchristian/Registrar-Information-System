import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { postAnalyticsAiQuery } from '../services/api';

/**
 * AIQueryChat
 *
 * Conversational NLQ interface for the analytics dashboard.
 *
 * Props
 * -----
 *  buildParams  () => object   — same params builder used by all analytics calls
 *
 * Conversation state is owned locally in this component.  On each send the
 * full history array is forwarded to POST /analytics/ai-query so the backend
 * can maintain context.  The server returns an updated history that replaces
 * the local one, ensuring client and server are always in sync.
 *
 * Security
 * --------
 * • Input is capped at MAX_INPUT_LENGTH characters (mirrors the backend limit).
 * • The input field rejects the submit if the trimmed value is empty.
 * • No raw API key is held in this component — all AI calls go through the
 *   backend endpoint which enforces PII-stripping and rate limiting.
 */

const MAX_INPUT_LENGTH = 2000;

const SUGGESTED_QUESTIONS = [
  'Which document type had the highest volume this period?',
  'What is the average processing time and is it within target?',
  'Are there any concerning trends in the forfeit rate?',
  'Which hour of the day sees peak request volume?',
];

const AIQueryChat = ({ buildParams }) => {
  const { isDark } = useTheme();

  const [history,  setHistory]  = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const handleSend = async (question = input.trim()) => {
    if (!question || loading) return;

    // Optimistically add the user bubble
    const optimisticHistory = [...history, { role: 'user', content: question }];
    setHistory(optimisticHistory);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await postAnalyticsAiQuery({
        question,
        history,           // send the pre-optimistic history; server appends both turns
        ...buildParams(),
      });
      setHistory(res.data.history);
    } catch (err) {
      // Roll back the optimistic user bubble on error
      setHistory(history);
      setError(
        err.response?.data?.error
          ?? err.response?.data?.message
          ?? 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setHistory([]);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  };

  const isEmpty = history.length === 0 && !loading;

  // ── Tailwind class helpers ────────────────────────────────────────────────

  const card   = isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-slate-200 bg-white';
  const muted  = isDark ? 'text-[#9a9a9a]' : 'text-slate-400';
  const strong = isDark ? 'text-white'      : 'text-[#800000]';

  return (
    <div className={`border rounded-2xl overflow-hidden ${card}`}>

      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4
        ${isDark ? 'bg-[#3a3b3c]' : 'bg-[#800000]'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/15">
            <SparklesIcon className={`w-7 h-7 ${isDark ? 'text-white' : 'text-slate-100'}`} />          
            </div>
          <div>
            <h2 className="text-lg font-bold uppercase tracking-tight text-white">
              Ask the Data
            </h2>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/60 mt-0.5">
              Conversational analytics assistant
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClear}
            title="Clear conversation"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/20
          bg-white/10 text-white/85 text-xs font-medium hover:bg-white/20 transition-colors
              ${isDark
                ? 'border-[#4e4f50] text-[#b0b3b8] hover:bg-[#3a3b3c]'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Message list */}
      <div className={`overflow-y-auto mt-2 max-h-105 flex flex-col gap-3 p-5 mx-2 rounded-2xl no-scrollbar 
        ${isDark ? 'bg-[#18191a]' : 'bg-slate-50'}`}
      >
        {isEmpty && (
          <EmptyState
            isDark={isDark}
            muted={muted}
            strong={strong}
            onSuggest={handleSend}
          />
        )}

        {history.map((msg, i) => (
          <MessageBubble key={i} msg={msg} isDark={isDark} />
        ))}

        {loading && <TypingBubble isDark={isDark} />}

        {error && (
          <div className={`flex items-start gap-2 text-xs rounded-xl p-3
            ${isDark ? 'bg-red-950/30 text-red-400' : 'bg-red-50 text-red-600'}`}
          >
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="relative flex items-center p-2.5">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask a question about the current analytics data…"
          disabled={loading}
          className={`w-full resize-none rounded-2xl px-4 py-3.5 pr-14 text-sm outline-none border transition-all
          ${isDark
            ? 'bg-[#3a3b3c] border-[#4e4f50] text-white placeholder-[#9a9a9a] focus:border-[#6e6f70]'
            : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#800000]'}
          disabled:opacity-60`}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className={`absolute right-5 p-2 rounded-xl transition-all
          ${isDark 
            ? 'bg-[#4e4f50] text-white hover:bg-[#6e6f70]'
            : 'bg-[#800000] text-white hover:bg-[#6b0000]'}
          disabled:opacity-45 disabled:cursor-not-allowed`}
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Character counter */}
      {input.length > MAX_INPUT_LENGTH * 0.8 && (
        <p className={`text-[10px] text-right font-mono ${muted}`}>
          {input.length} / {MAX_INPUT_LENGTH}
        </p>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const MessageBubble = ({ msg, isDark }) => {
  const isUser = msg.role === 'user';
  const renderContent = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i} className={isDark ? 'text-white font-semibold' : 'text-[#800000] font-semibold'}>{part}</strong>
        : part
    );
  };
  
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`shrink-0 p-1.5 rounded-full self-start mt-1 ${isDark ? 'bg-[#3a3b3c]' : 'bg-red-50'}`}>
          <SparklesIcon className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-[#800000]'}`} />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${isUser
            ? isDark
              ? 'bg-[#3a3b3c] text-white rounded-br-sm'
              : 'bg-[#800000] text-white rounded-br-sm'
            : isDark
              ? 'bg-[#2d2e2f] text-[#e4e6eb] rounded-bl-sm'
              : 'bg-white text-slate-700 rounded-bl-sm border border-slate-100'
          }`}
      >
        {isUser ? msg.content : renderContent(msg.content)}
      </div>
      {isUser && (
        <div className="shrink-0 self-end">
          <UserCircleIcon className={`w-6 h-6 ${isDark ? 'text-[#9a9a9a]' : 'text-slate-300'}`} />
        </div>
      )}
    </div>
  );
};

const TypingBubble = ({ isDark }) => (
  <div className={`flex gap-2 items-end px-4 py-3 border-t
  ${isDark ? 'border-[#3e4042]' : 'border-slate-100'}`}
  >
    <div className={`shrink-0 p-1.5 rounded-full ${isDark ? 'bg-[#3a3b3c]' : 'bg-red-50'}`}>
      <SparklesIcon className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-[#800000]'}`} />
    </div>
    <div className={`rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center
      ${isDark ? 'bg-[#2d2e2f]' : 'bg-white border border-slate-100'}`}
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={`w-1.5 h-1.5 rounded-full animate-bounce
            ${isDark ? 'bg-[#9a9a9a]' : 'bg-slate-300'}`}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

const EmptyState = ({ isDark, muted, strong, onSuggest }) => (
  <div className="flex flex-col items-center py-6 gap-5 text-center">
    <div className={`p-4 rounded-full ${isDark ? 'bg-[#2d2e2f]' : 'bg-white border border-slate-100'}`}>
      <SparklesIcon className={`w-7 h-7 ${isDark ? 'text-[#4e4f50]' : 'text-slate-300'}`} />
    </div>
    <div>
      <p className={`text-sm font-bold flex items-center justify-center text-center ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>
      Ask anything about the current data
    </p>
      <p className={`text-xs mt-1 max-w-xs mx-auto ${muted}`}>
        Try one of the suggestions below, or type your own question.
      </p>
    </div>
    <div className="flex flex-col gap-2 w-full max-w-md">
      {SUGGESTED_QUESTIONS.map((q) => (
        <button
          key={q}
          onClick={() => onSuggest(q)}
          className={`text-left text-xs px-4 py-2.5 rounded-lg border transition-colors
          ${isDark
            ? 'border-[#3e4042] text-[#b0b3b8] hover:bg-[#3a3b3c]'
            : 'border-slate-200 text-slate-600 hover:border-[#800000] hover:text-[#800000] hover:bg-red-50'}`}
        >
          {q}
        </button>
      ))}
    </div>
  </div>
);

export default AIQueryChat;
