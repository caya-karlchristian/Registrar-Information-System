import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import jsQR from 'jsqr';
import { useQueryClient } from '@tanstack/react-query';
import {
  XCircleIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { claimDocumentRequest } from '../services/api';
import { useTheme } from '../context/ThemeContext';

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

  // 'scanning' | 'submitting' | 'success' | 'error'
  const [phase, setPhase] = useState('scanning');
  const [claimedRequest, setClaimedRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  // Guards against the scan loop firing a second submit while the first
  // is still in flight (a static QR sits in frame across many polls).
  const submittingRef = useRef(false);

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
      const backendMessage = err?.response?.data?.message;
      if (status === 404) {
        setErrorMessage("No matching request found for that code. Double-check the code or try scanning again.");
      } else if (status === 422) {
        setErrorMessage(backendMessage || "This request can't be claimed right now — it may already be claimed, or isn't ready yet.");
      } else {
        setErrorMessage(backendMessage || 'Something went wrong completing the claim. Please try again.');
      }
      setPhase('error');
    } finally {
      submittingRef.current = false;
    }
  }, [stopCamera, queryClient]);

  const resetToScanning = useCallback(() => {
    setClaimedRequest(null);
    setErrorMessage('');
    setManualCode('');
    setCameraError('');
    setPhase('scanning');
  }, []);

  // Scan loop: only runs while phase === 'scanning' and the modal is open.
  useEffect(() => {
    if (!open || phase !== 'scanning') return;

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
            submitCredential({ uuid: code.data });
          }
        }, SCAN_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        // Most common causes: permission denied, no camera present, or
        // the site isn't served over HTTPS (getUserMedia requires a
        // secure context). All three leave the manual claim_code field
        // as the only path forward — which is exactly its job.
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera access, or use the code field below instead.'
            : 'Camera unavailable. Use the code field below instead.'
        );
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, phase, submitCredential, stopCamera]);

  // Belt-and-suspenders: stop the camera on unmount regardless of phase,
  // in case the component unmounts mid-scan (e.g. navigating away).
  useEffect(() => stopCamera, [stopCamera]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (code.length !== CLAIM_CODE_LENGTH) return;
    submitCredential({ claim_code: code });
  };

  const handleClose = () => {
    stopCamera();
    resetToScanning();
    onClose();
  };

  if (!open) return null;

  const ownerName = claimedRequest
    ? (claimedRequest.student_profile
        ? `${claimedRequest.student_profile.first_name} ${claimedRequest.student_profile.last_name}`
        : claimedRequest.alumni_profile
          ? `${claimedRequest.alumni_profile.first_name} ${claimedRequest.alumni_profile.last_name}`
          : 'Unknown requester')
    : '';

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
            <CameraIcon className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">Scan to Claim</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close scanner"
            className="text-white hover:text-yellow-200 transition"
          >
            <XCircleIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="p-5 space-y-4">

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
                  className="flex-1 px-4 py-2 rounded-lg bg-pup-maroon text-white text-sm font-bold hover:bg-pup-dark-maroon transition-colors"
                >
                  Scan Next
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'bg-[#3a3b3c] text-white hover:bg-[#4e4f50]' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Camera preview */}
              <div className={`relative rounded-lg overflow-hidden aspect-square flex items-center justify-center ${isDark ? 'bg-[#18191a]' : 'bg-gray-900'}`}>
                {phase === 'scanning' && !cameraError && (
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                )}
                {phase === 'submitting' && (
                  <div className="text-white text-sm font-semibold animate-pulse">Completing claim…</div>
                )}
                {phase === 'scanning' && cameraError && (
                  <div className="text-center px-6">
                    <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-white text-xs">{cameraError}</p>
                  </div>
                )}
                {phase === 'error' && (
                  <div className="text-center px-6">
                    <ExclamationTriangleIcon className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <button
                      type="button"
                      onClick={resetToScanning}
                      className="px-4 py-2 rounded-lg bg-pup-maroon text-white text-sm font-bold hover:bg-pup-dark-maroon transition-colors"
                    >
                      Try Scanning Again
                    </button>
                  </div>
                )}
                {/* Off-screen canvas used only for pixel sampling — never
                    shown, it's the source jsQR reads frames from. */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {phase === 'error' && (
                <div className={`rounded-lg border px-3 py-2.5 text-sm ${isDark ? 'bg-red-900/20 border-red-900/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {errorMessage}
                </div>
              )}

              {/* Manual fallback — always available, not a separate screen */}
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                  No phone or scan not working? Enter claim code:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, CLAIM_CODE_LENGTH))}
                    placeholder="A7X92K"
                    maxLength={CLAIM_CODE_LENGTH}
                    disabled={phase === 'submitting'}
                    className={`flex-1 px-3 py-2 rounded-lg border font-mono text-lg tracking-[0.2em] text-center uppercase ${
                      isDark ? 'bg-[#3a3b3c] border-[#4e4f50] text-white placeholder:text-[#6b6d70]' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-300'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={manualCode.length !== CLAIM_CODE_LENGTH || phase === 'submitting'}
                    className="px-4 py-2 rounded-lg bg-pup-maroon text-white text-sm font-bold hover:bg-pup-dark-maroon transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Claim
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ClaimScannerModal;
