import { useState } from "react";
import { useAuth } from "../context/AuthProvider";

const AgreementPage = () => {
  const [agreed, setAgreed] = useState(false);
  const { logout, agreeToTerms } = useAuth(); 

  const handleCancel = () => logout();

  const handleContinue = () => {
    if (!agreed) return;
    agreeToTerms(); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-[#800000]/20">

        <div className="bg-[#800000] px-6 py-6 border-b-4 border-[#FFD700]">
          <h2 className="text-white text-2xl font-black tracking-tighter uppercase">
            Terms and Conditions
          </h2>
        </div>

        <div className="px-8 py-8 space-y-6">
          <div className="text-[#4a0000] text-sm leading-relaxed space-y-4">
            <p>
              By clicking <span className="text-[#800000] font-bold">"I Agree"</span>, you consent to the
              collection, use, and processing of your personal data for legitimate purpose 
              related to this service.
            </p>
            <p>
                Your information will be handled in accordance with our{" "}
                <a href="https://privacy.gov.ph/data-privacy-act/?fbclid=IwY2xjawQcy1dleHRuA2FlbQIxMQBzcnRjBmFwcF9pZAEwAAEereiMgQDJtFGCie9VF0aVaGClaRsrzpQ79qnS7YPx56HQoR0geRvGcKe6CuQ_aem_Ii8u2U0Y1pTgyTT5zPAe4Q" target="_blank" rel="noopener noreferrer">
                    <strong className="text-[#800000]">Privacy Policy</strong>
                </a>{" "}
                and in compliance with the{" "}
                <a href="https://www.pup.edu.ph/privacy/" target="_blank" rel="noopener noreferrer">
                    <strong className="text-[#800000]">Data Privacy Act of 2012</strong>
                </a>
            </p>
          </div>

          <label className={`flex items-center gap-4 cursor-pointer transition-all duration-300`}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="w-5 h-4 accent-[#800000] cursor-pointer"
            />
            <span className="text-[#800000] font-bold text-sm">
              I Agree and acknowledge the Terms and Conditions
            </span>
          </label>
        </div>

        <div className="px-8 py-5 bg-gray-50 flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="text-[#800000] text-xs font-bold uppercase tracking-widest hover:underline transition"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!agreed}
            className={`px-10 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-md
              ${agreed
                ? "bg-[#800000] hover:bg-[#4a0000] text-[#FFD700] active:translate-y-0.5"
                : "bg-[#800000] hover:bg-[#4a0000] text-white cursor-not-allowed"
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