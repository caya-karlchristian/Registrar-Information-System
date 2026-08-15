import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ClipboardDocumentIcon, CheckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';
import { toPng } from 'html-to-image';

/**
 * ClaimTicket — the student-facing "claim ticket" for a document request.
 *
 * Renders the QR code (encodes the request's uuid — scanned by staff at
 * the Registrar counter) together with the short claim_code as plain
 * text underneath it, per QR Code Claiming Policy v1.0 §3.2/3.7 and the
 * "always show both, never one without the other" convention discussed
 * for this feature: a scan can fail (glare, a bad print, a cracked
 * screen), and the code must stay usable on its own when that happens.
 *
 * Deliberately dumb/presentational — no data fetching, no API calls.
 * Every screen that needs to show a claim ticket (submission pop-up,
 * dashboard request detail, inbox) renders this the same way, so
 * there is exactly one place this ever needs to be styled or fixed.
 *
 * Renders nothing if the request isn't actually claimable via QR yet
 * (no uuid/claim_code — e.g. an older request created before this
 * feature existed, since the migration is nullable and not backfilled).
 */
const ClaimTicket = ({ uuid, claimCode, size = 160, downloadOnly = false }) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const contentRef = useRef(null);

  if (!uuid || !claimCode) {
    return null;
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(claimCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (non-HTTPS context, permissions).
      // Not worth surfacing an error for — the code is already visible
      // as plain text right below the button for manual copying.
    }
  };

  const handleDownloadPNG = () => {
    if (!contentRef.current) return;

    toPng(contentRef.current, {
      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
      style: {
        borderRadius: '16px',
      }
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `claim-ticket-${claimCode}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export Claim Ticket to PNG', err);
      });
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Printable/Downloadable Ticket Wrapper */}
      <div
        ref={contentRef}
        className={`${
          downloadOnly 
            ? 'absolute left-[-9999px] top-[-9999px]' 
            : 'flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden'
        } ${isDark
            ? 'bg-[#1e1e1e] border-[#333333] shadow-[0_8px_30px_rgb(0,0,0,0.4)]'
            : 'bg-white border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
          }`}
        style={{ minWidth: '280px', maxWidth: '340px' }}
      >
        {/* Decorative top gold/maroon accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#800000] via-[#FFC72C] to-[#800000]" />

        <div className="flex flex-col items-center gap-1 mt-1 text-center">
          <h4
            className={`text-[11px] font-extrabold uppercase tracking-[0.2em] ${isDark ? 'text-[#FFC72C]' : 'text-[#800000]'
              }`}
          >
            Registrar Claim Ticket
          </h4>
          <span className={`text-[9px] font-bold ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
          </span>
        </div>

        {/* QR Code Container with premium double border */}
        <div className={`p-3 rounded-xl bg-white border ${isDark ? 'border-zinc-800' : 'border-gray-100'
          }`}>
          <div className="border border-dashed border-gray-250 p-1.5 rounded-lg">
            <QRCodeSVG id={`qr-svg-${claimCode}`} value={uuid} size={size} level="M" />
          </div>
        </div>

        <p className={`text-[11px] leading-relaxed text-center px-2 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Present this QR code at the Registrar counter to instantly retrieve and claim your documents.
        </p>

        {/* Divider */}
        <div className={`w-full border-t border-dashed ${isDark ? 'border-zinc-800' : 'border-gray-200'}`} />

        {/* Fallback Claim Code */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            Manual Claim Code
          </span>

          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy claim code"
            className={`group flex items-center justify-between gap-3 px-4 py-2 w-full rounded-xl font-mono text-base font-bold tracking-[0.25em] border transition-all active:scale-98 cursor-pointer ${isDark
                ? 'bg-[#151515] text-[#FFC72C] border-zinc-800 hover:bg-[#202020] hover:border-[#FFC72C]/30'
                : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
              }`}
          >
            {/* Spacer to center the code */}
            <span className="w-4" />
            <span className="translate-x-2">{claimCode}</span>

            <span className="text-gray-400 dark:text-zinc-600 group-hover:text-gray-600 dark:group-hover:text-[#FFC72C] transition-colors shrink-0">
              {copied ? (
                <CheckIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Action Buttons (placed outside the printable/downloadable wrapper) */}
      <div className="flex items-center justify-center w-full print:hidden">
        <button
          type="button"
          onClick={handleDownloadPNG}
          className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer text-white bg-[#800000] hover:bg-[#6c0000] ${
            downloadOnly ? 'w-full max-w-[280px]' : 'w-full'
          }`}
          style={downloadOnly ? {} : { maxWidth: '340px' }}
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Download Ticket
        </button>
      </div>
    </div>
  );
};

export default ClaimTicket;
