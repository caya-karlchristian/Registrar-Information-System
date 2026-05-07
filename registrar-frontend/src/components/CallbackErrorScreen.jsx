import React from 'react';
import { ExclamationCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

/**
 * CallbackErrorScreen
 *
 * Shown by SsoCallbackPage when the backend returns a 403 — meaning the
 * user authenticated successfully with the IdP but has no role in RIS.
 *
 * Props
 * -----
 * onBack  () => void   Called when the user clicks "Back to Login".
 *                      The parent decides the navigation target (typically
 *                      window.location.href = idpLogoutUrl) so this
 *                      component stays purely presentational.
 */
const STEPS = [
  {
    number: 1,
    title: 'Return to Login',
    description: 'Click the button below to go back to the login page.',
  },
  {
    number: 2,
    title: 'Register Your Account',
    description: 'Click "Register" and fill in your details to request access.',
  },
  {
    number: 3,
    title: 'Sign In',
    description: 'Once registered, return to the login page and sign in.',
  },
];

const CallbackErrorScreen = ({ onBack }) => (
  <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
    <div className="w-full max-w-xl overflow-hidden rounded-lg border border-white/20 bg-[#800000] text-white shadow-xl">

      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-pup-maroon border-b border-white/15">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-pup-maroon shrink-0">
          <ExclamationCircleIcon className="h-8 w-6" strokeWidth={2.5} />
        </div>
        <div className="ml-3 min-w-0">
          <p className="text-lg sm:text-xl font-semibold leading-snug text-white">
            Oops! Hang tight — your account is not set up yet.
          </p>
          <p className="mt-1 text-sm leading-snug text-white/85">
            You&apos;ve signed in successfully, but your account hasn&apos;t
            been added to the system.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
          What to do?
        </h2>

        <div className="mt-3 space-y-2">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="flex gap-3 rounded-md border border-white/15 bg-white/5 px-3 py-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-pup-maroon text-xs font-bold">
                {step.number}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                <p className="mt-0.5 text-sm leading-5 text-white/75">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action */}
        <div className="mt-4 flex items-center border-t border-white/15 pt-4">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Login
          </button>
        </div>
      </div>

    </div>
  </div>
);

export default CallbackErrorScreen;
