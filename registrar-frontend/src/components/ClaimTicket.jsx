import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

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
const ClaimTicket = ({ uuid, claimCode, size = 160 }) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);

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

  return (
    <div
      className={`flex flex-col items-center gap-3 p-4 rounded-lg border ${
        isDark ? 'bg-[#3a3b3c] border-[#4e4f50]' : 'bg-white border-gray-200'
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          isDark ? 'text-[#e4e6eb]' : 'text-pup-maroon'
        }`}
      >
        Your Claim Ticket
      </p>

      <div className="p-2 bg-white rounded-md">
        <QRCodeSVG value={uuid} size={size} level="M" />
      </div>

      <p className={`text-[11px] text-center max-w-[220px] ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
        Show this QR code at the Registrar's Office when your document is Ready to Claim.
      </p>

      {/* Fallback code — always shown alongside the QR, never only on
          request, so a bad print or a dead phone still leaves a usable
          claim ticket. See ClaimTicket docblock. */}
      <div className="flex flex-col items-center gap-1 mt-1">
        <span className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-[#8a8d91]' : 'text-gray-400'}`}>
          No phone or can't scan? Give staff this code:
        </span>
        <button
          type="button"
          onClick={handleCopyCode}
          title="Copy claim code"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-lg font-bold tracking-[0.2em] transition-colors ${
            isDark
              ? 'bg-[#242526] text-[#FFC72C] hover:bg-[#1a1b1e]'
              : 'bg-pup-dark-maroon text-[#FFC72C] hover:bg-pup-maroon'
          }`}
        >
          {claimCode}
          {copied ? (
            <CheckIcon className="w-4 h-4" />
          ) : (
            <ClipboardDocumentIcon className="w-4 h-4 opacity-70" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ClaimTicket;
