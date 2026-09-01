import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthProvider";
import { useHeaderResponsiveState } from "../utils/helpers";

const AgreementPage = () => {
  const { isDark } = useTheme();
  const { logout, agreeToTerms, user } = useAuth(); 
  const [agreed, setAgreed] = useState(false);
  const [neverShow, setNeverShow] = useState(false);
  const { headerHeight, isMobile } = useHeaderResponsiveState();

  const handleCancel = () => logout();

  const handleContinue = () => {
    if (!agreed) return;
    if (neverShow) {
      localStorage.setItem(`neverShowAgreement_${user.user_id}`, "true"); 
    }
    agreeToTerms();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-[2px] overflow-y-auto">
      <div className={`w-full max-w-lg sm:max-w-xl max-h-[calc(100dvh-2rem)] flex flex-col rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border my-auto ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-[#800000]/20'}`}>

        {/* Header */}
        <div className={`px-5 sm:px-6 py-4 sm:py-5 border-b-4 shrink-0 ${isDark ? 'bg-[#1f1f1f] border-[#b98b00]' : 'bg-[#800000] border-[#FFD700]'}`}>
          <h2 className="text-white text-xl sm:text-2xl font-black tracking-tighter uppercase">
            Terms and Conditions
          </h2>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 sm:px-8 py-5 sm:py-6 space-y-5 overflow-y-auto flex-1 text-sm leading-relaxed">
          <div className={`space-y-4 ${isDark ? 'text-[#e4e6eb]' : 'text-[#4a0000]'}`}>
            <p>
              By clicking <span className={`${isDark ? 'text-[#f5c542]' : 'text-[#800000]'} font-bold`}>"I Agree"</span>, you consent to the
              collection, use, and processing of your personal data for legitimate purpose 
              related to this service.
            </p>
            <p>
                Your information will be handled in accordance with our{" "}
                <a href="https://www.pup.edu.ph/privacy/" target="_blank" rel="noopener noreferrer">
                    <strong className={isDark ? 'text-[#f5c542]' : 'text-[#800000]'}>Privacy Policy</strong>
                </a>{" "}
                and in compliance with the{" "}
                <a href="https://privacy.gov.ph/data-privacy-act/?fbclid=IwY2xjawQcy1dleHRuA2FlbQIxMQBzcnRjBmFwcF9pZAEwAAEereiMgQDJtFGCie9VF0aVaGClaRsrzpQ79qnS7YPx56HQoR0geRvGcKe6CuQ_aem_Ii8u2U0Y1pTgyTT5zPAe4Q" target="_blank" rel="noopener noreferrer">
                    <strong className={isDark ? 'text-[#f5c542]' : 'text-[#800000]'}>Data Privacy Act of 2012</strong>
                </a>
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className={`w-4 h-4 cursor-pointer shrink-0 ${isDark ? 'accent-[#f5c542]' : 'accent-[#800000]'}`}
              />
              <span className={`font-bold text-xs sm:text-sm ${isDark ? 'text-[#e4e6eb]' : 'text-[#800000]'}`}>
                I Agree and acknowledge the
                <a href="https://www.pup.edu.ph/terms/" target="_blank" rel="noopener noreferrer">
                  {" "}Terms and Conditions
                </a>
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={neverShow}
                onChange={e => setNeverShow(e.target.checked)}
                className={`w-4 h-4 cursor-pointer shrink-0 ${isDark ? 'accent-[#f5c542]' : 'accent-[#800000]'}`}
              />
              <span className={`font-bold text-xs sm:text-sm ${isDark ? 'text-[#e4e6eb]' : 'text-[#800000]'}`}>
                Never show this again
              </span>
            </label>
          </div>
        </div>

        {/* Action Footer */}
        <div className={`px-5 sm:px-8 py-4 sm:py-5 flex justify-end items-center gap-4 shrink-0 ${isDark ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
          <button
            onClick={handleCancel}
            className={`text-xs font-bold uppercase tracking-widest hover:underline transition cursor-pointer ${isDark ? 'text-[#f5c542]' : 'text-[#800000]'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!agreed}
            className={`px-6 sm:px-10 py-2.5 sm:py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer
              ${agreed
                ? isDark
                  ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] border border-[#4e4f50] active:translate-y-0.5'
                  : 'bg-[#800000] hover:bg-[#4a0000] text-[#FFD700] active:translate-y-0.5'
                : isDark
                  ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#8f949e] border border-[#4e4f50] cursor-not-allowed'
                  : 'bg-[#800000] hover:bg-[#4a0000] text-white cursor-not-allowed'
              }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgreementPage;