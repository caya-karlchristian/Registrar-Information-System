import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
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
const ClaimTicket = ({ uuid, claimCode, size = 160, downloadOnly = false, small = false }) => {
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
      },
      filter: (node) => {
        return !(node.classList && node.classList.contains('download-btn-hide'));
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

  const qrSize = small && size === 160 ? 108 : size;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Printable/Downloadable Ticket Wrapper */}
      <div
        ref={contentRef}
        className={`${
          downloadOnly 
            ? 'absolute left-[-9999px] top-[-9999px]' 
            : `flex flex-row items-stretch transition-all duration-300 relative overflow-hidden ${
                small ? 'gap-4 p-4 sm:p-5 rounded-xl border' : 'gap-6 p-6 rounded-2xl border'
              }`
        } ${isDark
            ? 'bg-[#1e1e1e] border-[#333333] shadow-[0_8px_30px_rgb(0,0,0,0.4)]'
            : 'bg-white border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
          }`}
        style={{ minWidth: '280px', maxWidth: small ? '420px' : '540px' }}
      >
        {/* Decorative top gold/maroon accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#800000] via-[#FFC72C] to-[#800000]" />

        {/* Left Column: Details & Code */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex flex-col gap-1 text-left">
              <h4
                className={`font-extrabold uppercase tracking-[0.2em] ${
                  small ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                } ${isDark ? 'text-[#FFC72C]' : 'text-[#800000]'}`}
              >
                Registrar Claim Ticket
              </h4>
            </div>
            <p className={`leading-relaxed text-left ${small ? 'text-[10.5px] sm:text-[11px]' : 'text-[11px] sm:text-xs'} ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              Present this QR code at the Registrar counter to instantly retrieve and claim your documents.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <span className={`font-bold uppercase tracking-wider ${small ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'} ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
              Manual Claim Code:
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy claim code"
              className={`group flex items-center justify-between gap-3 w-full rounded-xl font-mono font-bold tracking-[0.25em] border transition-all active:scale-98 cursor-pointer ${
                small ? 'px-3 py-1.5 text-sm sm:text-base' : 'px-4 py-2 text-base sm:text-lg'
              } ${isDark
                  ? 'bg-[#151515] text-[#FFC72C] border-zinc-800 hover:bg-[#202020] hover:border-[#FFC72C]/30'
                  : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
            >
              <span className="w-4" />
              <span>{claimCode}</span>
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

        {/* Vertical Divider (always visible) */}
        <div className={`block border-l border-dashed ${isDark ? 'border-zinc-800' : 'border-gray-200'}`} />

        {/* Right Column: QR Code Container & Download Action */}
        <div className="flex flex-col items-center justify-center gap-2 shrink-0">
          <div className={`rounded-xl bg-white border ${small ? 'p-2' : 'p-3'} ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
            <div className={`border border-dashed border-gray-250 rounded-lg ${small ? 'p-1' : 'p-1.5'}`}>
              <QRCodeCanvas id={`qr-canvas-${claimCode}`} value={uuid} size={qrSize} level="M" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPNG}
            title="Download ticket as image"
            className="download-btn-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-[8px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer mt-1 print:hidden bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-[#2d2d30] dark:hover:text-white"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3" />
            Download Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimTicket;
