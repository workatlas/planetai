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
      className="fixed inset-0 z-[65] flex items-end justify-center bg-[#142c26]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-terms-title"
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-[#dce5dc] bg-white p-6 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#c1d2c4] bg-[#eef4ee] text-[#47745c]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="privacy-terms-title" className="text-lg font-bold text-[#1d3028]">
                Privacy Policy
              </h2>
              <p className="text-xs text-[#77847b]">How PlanetAI handles information</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy policy"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#77847b] hover:bg-[#f4f6f2] hover:text-[#25372e]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-6 text-[#52635a]">
          <section className="rounded-xl border border-[#e2e8e1] bg-[#f7f8f6] p-4">
            <h3 className="font-bold text-[#25372e]">1. Browsing and job applications</h3>
            <p className="mt-1">You can browse PlanetAI job listings and use public career information without creating an applicant account. When you choose to apply, you are directed to the employer’s or platform’s application destination. Their privacy policy governs information you provide there.</p>
          </section>
          <section className="rounded-xl border border-[#e2e8e1] bg-[#f7f8f6] p-4">
            <h3 className="font-bold text-[#25372e]">2. Employer accounts and job submissions</h3>
            <p className="mt-1">If an employer creates a workspace or submits a listing, PlanetAI processes information such as account email, company and profile details, job content, verification and moderation status, and relevant listing or payment references to operate the service, review submissions, and manage published listings.</p>
          </section>
          <section className="rounded-xl border border-[#e2e8e1] bg-[#f7f8f6] p-4">
            <h3 className="font-bold text-[#25372e]">3. Browser storage and career tools</h3>
            <p className="mt-1">Features such as saved roles, application-tracker entries, and alert preferences may be stored in your browser. Career-tool drafts and voice samples are designed for local browser use; avoid entering sensitive personal information and review each tool’s behavior before sharing content outside PlanetAI.</p>
          </section>
          <section className="rounded-xl border border-[#e2e8e1] bg-[#f7f8f6] p-4">
            <h3 className="font-bold text-[#25372e]">4. Service providers and advertising</h3>
            <p className="mt-1">PlanetAI uses service providers to support hosting, database and authentication functions, communications, and payment-related workflows. A clearly labelled Google AdSense placement may appear in selected informational areas, separate from job listings and core career tools. Google may use cookies or similar technologies to provide and measure advertising, subject to your browser settings, applicable consent choices, and Google’s policies.</p>
          </section>
          <section className="rounded-xl border border-[#e2e8e1] bg-[#f7f8f6] p-4">
            <h3 className="font-bold text-[#25372e]">5. Questions or privacy requests</h3>
            <p className="mt-1">For questions about this notice or a privacy request, contact <a className="font-semibold text-[#315b47] underline underline-offset-2" href="mailto:workatlas.team@gmail.com">workatlas.team@gmail.com</a>. Please do not send passwords or other sensitive credentials by email.</p>
          </section>
          <p className="text-[11px] leading-5 text-[#87938b]">This notice describes current PlanetAI product practices at a high level and may be updated as features and service providers change. Last updated: November 18, 2026.</p>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl bg-[#183c32] px-5 py-2 text-sm font-bold text-white hover:bg-[#285c4b]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
