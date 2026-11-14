import React from 'react';
import {ShieldCheck, X} from 'lucide-react';

interface PrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-terms-title"
    >
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="privacy-terms-title"
                className="font-display text-lg font-bold text-slate-50"
              >
                Privacy Policy & Terms of Use
              </h2>
              <p className="text-xs text-slate-400">
                PlanetAI Transparency & Google Play Compliance Disclosure
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy policy and terms"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-4">
            <h3 className="font-semibold text-slate-100">
              1. Independent Aggregator & Referral Disclosure
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              PlanetAI is an independent AI and remote job aggregator and affiliate/referral partner (including partner links to platforms such as micro1, Babel Audio, Mercor, Visora, and Spout). PlanetAI does not act as the direct employer for listed positions and requires zero account registration to browse or use its career tools.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-4">
            <h3 className="font-semibold text-slate-100">
              2. External Third-Party Employer Links
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              All external job application and platform links are clearly marked with an external link icon (↗) and open in your external browser or a new tab. When you leave PlanetAI, your application data and interactions are governed by the respective third-party platform’s privacy policy and terms.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-4">
            <h3 className="font-semibold text-slate-100">
              3. Local-Only Microphone & Career Tools Processing
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Audio recorded inside the Voice Sample AI Prep tool uses your browser’s local Web Audio API and stays strictly inside your device’s browser memory. Voice clips, resumes, and email drafts are never uploaded to or stored on any PlanetAI server. Preferences such as saved jobs and alert choices are stored locally in your browser’s localStorage.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-4">
            <h3 className="font-semibold text-slate-100">
              4. Advertising Disclosure (Google AdSense & AdMob)
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              To keep PlanetAI 100% free with no signup barriers, non-intrusive banner advertisements are served via Google AdSense (Web) and Google AdMob (Android WebView/APK). Google and its partners may use cookies or device identifiers in accordance with Google’s advertising privacy policies.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
