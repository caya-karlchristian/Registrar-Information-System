import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import jsQR from 'jsqr';
import { useQueryClient } from '@tanstack/react-query';
import {
  XCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { claimDocumentRequest } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { formatName } from '../utils/formatters';

/**
 * ClaimScannerModal — the staff-facing counterpart to ClaimTicket.
 *
 * Implements QR Code Claiming Policy v1.0 §3.4-3.7:
 *   §3.4  Only a request that's actually ReadyToClaim can be completed by
 *         a scan — enforced server-side (DocumentRequestService::
 *         claimRequest() -> updateRequest()'s allowedTransitions() guard),
 *         not by anything in this component. A scan on a Processing or
 *         already-Completed request is rejected by the API and shown here
 *         as an error, same as any other failed claim attempt.
 *   §3.5  "Do not scan if requirements are incomplete" is a physical,
 *         in-person judgment call staff make before they even open this
 *         modal — confirmed earlier as having no UI gate, so there is
 *         deliberately no confirm-before-scanning checkbox here.
 *   §3.7  Single-use is enforced by the same transition guard: Completed
 *         has no allowedTransitions(), so a second scan of an
 *         already-claimed request fails naturally — no separate
 *         "already used" check needed on either end.
 *
 * Two ways in, exactly one used per submission (mirrors
 * ClaimDocumentRequestRequest's uuid XOR claim_code validation):
 *   1. Camera scan — decodes the uuid encoded in the student's QR.
 *   2. Manual claim_code entry — the fallback for a camera that won't
 *      focus/isn't available, a cracked screen, or a student with no
 *      phone. Always visible alongside the scanner, never a separate
 *      screen, per the "scan fails sometimes" reasoning discussed for
 *      this feature.
 *
 * Camera lifecycle: getUserMedia is requested only while this modal is
 * mounted and only while in 'scanning' state, and every exit path (close,
 * unmount, success, error) stops every track on the stream. Leaving a
 * camera stream running after the modal closes would be both a privacy
 * problem and a battery/perf leak on the staff workstation.
 */

const CLAIM_CODE_LENGTH = 6;
const SCAN_INTERVAL_MS = 200; // ~5 scans/sec — plenty for a static QR, kind to CPU

const ClaimScannerModal = ({ open, onClose }) => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  // 'scanning' | 'submitting' | 'success'
  const [phase, setPhase] = useState('scanning');
  const [mode, setMode] = useState('scan'); // 'scan' | 'manual'
  const [claimedRequest, setClaimedRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCode, setManualCode] = useState(Array(CLAIM_CODE_LENGTH).fill(''));
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  // Guards against the scan loop firing a second submit while the first
  // is still in flight (a static QR sits in frame across many polls).
  const submittingRef = useRef(false);
  const inputRefs = useRef([]);
  const manualCodeString = manualCode.join('').trim().toUpperCase();

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const submitCredential = useCallback(async (credential) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    stopCamera();
    setPhase('submitting');
    setErrorMessage('');

    try {
      const { data } = await claimDocumentRequest(credential);
      setClaimedRequest(data);
      setPhase('success');
      // Same invalidation the rest of the dashboard's mutations rely on
      // (see useStaffDashboard's invalidateRequests) — a broad prefix
      // match so both the 'active' and 'archived' query caches, whichever
      // is mounted, pick up the now-Completed request on next render.
      queryClient.invalidateQueries({ queryKey: ['documentRequests'] });
    } catch (err) {
      const status = err?.response?.status;
      let finalMsg = 'Failed to process claim. Please check your internet connection or try again later.';

      if (status === 404) {
        finalMsg = "No matching request found for that code. Please double-check and try again.";
      } else if (status === 422) {
        finalMsg = "This request cannot be claimed at this time. It may have already been claimed or is not yet ready.";
      } else if (status === 403) {
        finalMsg = "Access denied. You do not have permission to claim this request.";
      } else if (status === 400) {
        finalMsg = "Invalid claim request format. Please scan a valid QR code or check your claim code.";
      }

      setErrorMessage(finalMsg);
      setPhase('scanning');
    } finally {
      submittingRef.current = false;
    }
  }, [stopCamera, queryClient]);

  const resetToScanning = useCallback(() => {
    setClaimedRequest(null);
    setErrorMessage('');
    setManualCode(Array(CLAIM_CODE_LENGTH).fill(''));
    setCameraError('');
    setPhase('scanning');
    setMode('scan');
  }, []);

  // Scan loop: only runs while phase === 'scanning', mode === 'scan' and the modal is open.
  useEffect(() => {
    if (!open || phase !== 'scanning' || mode !== 'scan') return;

    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        scanTimerRef.current = setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code?.data) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code.data);
            if (!isUuid) {
              setErrorMessage("Invalid QR code format. Please scan a valid ticket QR code.");
            } else {
              submitCredential({ uuid: code.data });
            }
          }
        }, SCAN_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        // Most common causes: permission denied, no camera present, or
        // the site isn't served over HTTPS (getUserMedia requires a
        // secure context). All three leave the manual claim_code field
        // as the only path forward — which is exactly its job.
        const msg = err?.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera access, or use the code field below instead.'
          : 'Camera unavailable. Use the code field below instead.';
        setCameraError(msg);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, phase, mode, submitCredential, stopCamera]);

  // Belt-and-suspenders: stop the camera on unmount regardless of phase,
  // in case the component unmounts mid-scan (e.g. navigating away).
  useEffect(() => stopCamera, [stopCamera]);

  const handleInputChange = (index, value) => {
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanValue) {
      const newCode = [...manualCode];
      newCode[index] = '';
      setManualCode(newCode);
      return;
    }

    const char = cleanValue[cleanValue.length - 1];
    const newCode = [...manualCode];
    newCode[index] = char;
    setManualCode(newCode);

    if (index < CLAIM_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!manualCode[index] && index > 0) {
        const newCode = [...manualCode];
        newCode[index - 1] = '';
        setManualCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...manualCode];
        newCode[index] = '';
        setManualCode(newCode);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < CLAIM_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    if (pastedData.length > 0) {
      const newCode = [...manualCode];
      for (let i = 0; i < CLAIM_CODE_LENGTH; i++) {
        newCode[i] = pastedData[i] || '';
      }
      setManualCode(newCode);
      const focusIndex = Math.min(pastedData.length, CLAIM_CODE_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleFocus = (index) => {
    const firstEmptyIndex = inputRefs.current.findIndex((ref) => ref && ref.value === '');
    if (firstEmptyIndex !== -1 && index > firstEmptyIndex) {
      inputRefs.current[firstEmptyIndex]?.focus();
    } else {
      inputRefs.current[index]?.select();
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCodeString.length !== CLAIM_CODE_LENGTH || phase === 'submitting') return;
    submitCredential({ claim_code: manualCodeString });
  };

  const handleClose = () => {
    stopCamera();
    resetToScanning();
    onClose();
  };

  if (!open) return null;

  const ownerName = claimedRequest ? formatName(claimedRequest) || 'Unknown requester' : '';

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`}
        onClick={handleClose}
      />
      <div className={`relative rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>

        {/* Header */}
        <div className={`relative px-5 py-4 flex justify-between items-center shrink-0 ${isDark ? 'bg-[#3a3b3c]' : 'bg-pup-maroon'}`}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M4 16v2a2 2 0 0 0 2 2h2M16 20h2a2 2 0 0 0 2-2v-2M4 12h16" />
            </svg>
            <h3 className="text-base font-bold text-white">Scan QR code</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close scanner"
            className="text-white hover:text-yellow-200 transition cursor-pointer"
          >
            <XCircleIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <style>{`
            @keyframes scanLine {
              0%, 100% { top: 6%; }
              50% { top: 94%; }
            }
            .animate-scan-line {
              animation: scanLine 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
          `}</style>

          {phase === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircleIcon className="w-14 h-14 text-green-500" />
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Claim Completed</p>
              <p className={`text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                Request #{claimedRequest?.request_id} — {ownerName}
              </p>
              <div className="flex gap-3 mt-2 w-full">
                <button
                  type="button"
                  onClick={resetToScanning}
                  className="flex-1 px-4 py-2 rounded-lg bg-pup-maroon text-white text-sm font-bold hover:bg-pup-dark-maroon transition-colors cursor-pointer"
                >
                  Scan Next
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${isDark ? 'bg-[#3a3b3c] text-white hover:bg-[#4e4f50]' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Tabs selector */}
              {phase !== 'submitting' && (
                <div className={`flex border-b mb-4 ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
                  <button
                    type="button"
                    onClick={() => { setMode('scan'); setErrorMessage(''); }}
                    className={`flex-1 pb-3 text-sm font-semibold transition-all relative border-b-2 -mb-0.5 focus:outline-none cursor-pointer ${
                      mode === 'scan'
                        ? isDark ? 'text-pup-yellow border-pup-yellow font-bold' : 'text-pup-maroon border-pup-maroon font-bold'
                        : isDark
                        ? 'text-zinc-400 border-transparent hover:text-white'
                        : 'text-zinc-500 border-transparent hover:text-gray-900'
                    }`}
                  >
                    Scan QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('manual'); setErrorMessage(''); }}
                    className={`flex-1 pb-3 text-sm font-semibold transition-all relative border-b-2 -mb-0.5 focus:outline-none cursor-pointer ${
                      mode === 'manual'
                        ? isDark ? 'text-pup-yellow border-pup-yellow font-bold' : 'text-pup-maroon border-pup-maroon font-bold'
                        : isDark
                        ? 'text-zinc-400 border-transparent hover:text-white'
                        : 'text-zinc-500 border-transparent hover:text-gray-900'
                    }`}
                  >
                    Enter Claim Code
                  </button>
                </div>
              )}

              {/* In-Modal Error Alert Banner below tabs */}
              {errorMessage && (
                <div className={`p-3 rounded-xl mb-4 flex items-start gap-2.5 text-xs font-semibold border ${
                  isDark
                    ? 'bg-red-950/40 border-red-800/50 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div className="flex-1 leading-snug">{errorMessage}</div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage('')}
                    className="text-gray-400 hover:text-gray-600 font-bold ml-1 cursor-pointer text-base leading-none"
                  >
                    ×
                  </button>
                </div>
              )}

              {mode === 'scan' ? (
                <>
                  {/* Camera preview */}
                  <div className={`relative rounded-2xl overflow-hidden aspect-square flex items-center justify-center border transition-all duration-300 ${
                    isDark ? 'bg-[#18191a] border-[#3e4042]' : 'bg-gray-900 border-gray-200'
                  }`}>
                    {phase === 'scanning' && !cameraError && (
                      <>
                        {/* Camera Feed */}
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

                        {/* Glowing Scan Laser Line */}
                        <div className={`absolute left-[6%] right-[6%] h-[2.5px] animate-scan-line pointer-events-none z-10 ${
                          isDark ? 'bg-pup-yellow shadow-[0_0_8px_rgba(248,191,30,0.8)]' : 'bg-pup-maroon shadow-[0_0_8px_rgba(139,0,0,0.8)]'
                        }`} />

                        {/* Corner Brackets */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-white/80 rounded-tl-lg pointer-events-none z-10" />
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-white/80 rounded-tr-lg pointer-events-none z-10" />
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-white/80 rounded-bl-lg pointer-events-none z-10" />
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-white/80 rounded-br-lg pointer-events-none z-10" />
                      </>
                    )}
                    {phase === 'submitting' && (
                      <div className="text-white text-sm font-semibold animate-pulse z-10">Completing claim…</div>
                    )}
                    {phase === 'scanning' && cameraError && (
                      <div className="text-center px-6 z-10">
                        <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <p className="text-white text-xs">{cameraError}</p>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* Guide text under camera preview */}
                  <p className={`text-xs text-center mt-3 mb-4 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Point your QR code at the camera. If the camera isn't working, switch to the "Enter Claim Code" tab.
                  </p>

                  {/* Cancel Button */}
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={handleClose}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                        isDark
                          ? 'bg-[#242526] text-white hover:bg-zinc-800 border border-zinc-800'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <rect x="2" y="6" width="20" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                        <rect x="5" y="10" width="2" height="4" rx="0.5" />
                        <rect x="9" y="10" width="2" height="4" rx="0.5" />
                        <rect x="13" y="10" width="2" height="4" rx="0.5" />
                        <rect x="17" y="10" width="2" height="4" rx="0.5" />
                      </svg>
                      <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Enter verification code
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Enter the 6-digit code sent in your inbox.
                    </p>
                  </div>
                  
                  {/* 6-Digit input boxes */}
                  <div className="flex justify-between gap-2 sm:gap-3">
                    {manualCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type="text"
                        inputMode="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleInputChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onFocus={() => handleFocus(idx)}
                        onPaste={handlePaste}
                        placeholder="0"
                        disabled={phase === 'submitting'}
                        className={`w-10 h-10 sm:w-14 sm:h-14 text-center text-base sm:text-xl font-bold rounded-lg sm:rounded-xl border transition-all duration-200 focus:outline-none ${
                          isDark
                            ? 'bg-[#1a1a1a] border-[#27272a] text-white placeholder-zinc-700 focus:border-pup-yellow focus:ring-1 focus:ring-pup-yellow'
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-300 focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Cancel and Verify buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                        isDark
                          ? 'bg-[#242526] text-white hover:bg-zinc-800 border border-zinc-800'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      disabled={manualCodeString.length !== CLAIM_CODE_LENGTH || phase === 'submitting'}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        manualCodeString.length === CLAIM_CODE_LENGTH && phase !== 'submitting'
                          ? 'bg-pup-maroon text-white hover:bg-pup-dark-maroon cursor-pointer'
                          : 'bg-pup-maroon/50 text-white/50 cursor-not-allowed'
                      }`}
                    >
                      Verify
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ClaimScannerModal;