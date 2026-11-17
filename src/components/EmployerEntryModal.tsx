import React from 'react';
import {ArrowRight, BriefcaseBusiness, CheckCircle2, LockKeyhole, ShieldCheck, X} from 'lucide-react';
import {PlanetAILogo} from './PlanetAILogo';

interface EmployerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueWithoutAccount: () => void;
}

export const EmployerEntryModal: React.FC<EmployerEntryModalProps> = ({
  isOpen,
  onClose,
  onContinueWithoutAccount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-[#10271f]/65 p-0 backdrop-blur-md sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employer-entry-title"
    >
      <section className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] border border-[#dce5dc] bg-[#f7f8f6] shadow-[0_32px_100px_rgba(8,30,20,.28)] sm:rounded-[28px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close employer options"
          className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-[#e0e7df] bg-white text-[#718078] transition hover:bg-[#edf3ed] hover:text-[#183c32]"
        >
          <X size={18}/>
        </button>

        <div className="overflow-hidden rounded-t-[28px] bg-[#183c32] px-6 pb-8 pt-8 text-white sm:px-10 sm:pb-10 sm:pt-10">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <PlanetAILogo className="h-10 w-10"/>
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-[-.05em]">PLANETAI</span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[.2em] text-[#b7d0c0]">Employer centre</span>
            </span>
          </div>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#d5e7da]">
            <ShieldCheck size={13}/> Built for confident hiring
          </p>
          <h2 id="employer-entry-title" className="mt-4 max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-.055em] sm:text-4xl">
            Bring the right people into your next chapter.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#c5d9cb]">
            Choose how you want to manage your hiring. Create a secure company workspace, return to an existing one, or submit a standard role without an account.
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:gap-4 sm:p-8">
          <a
            href="/?experience=employer-auth&mode=signup"
            className="group flex min-h-[174px] flex-col rounded-2xl border border-[#c9d9cb] bg-white p-5 shadow-[0_8px_24px_rgba(27,55,38,.045)] transition hover:-translate-y-0.5 hover:border-[#83a58d] hover:shadow-[0_14px_32px_rgba(27,55,38,.09)] sm:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf2eb] text-[#315f46]"><BriefcaseBusiness size={19}/></span>
            <span className="mt-4 text-base font-bold tracking-tight text-[#20372a]">Create an employer account</span>
            <span className="mt-1 text-xs leading-5 text-[#7d8b81]">Set up your company workspace and manage your hiring activity.</span>
            <span className="mt-auto flex items-center gap-2 pt-5 text-xs font-bold text-[#315f46]">Create account <ArrowRight size={14} className="transition group-hover:translate-x-1"/></span>
          </a>

          <a
            href="/?experience=employer-auth&mode=signin"
            className="group flex min-h-[174px] flex-col rounded-2xl border border-[#dce5dc] bg-white p-5 shadow-[0_8px_24px_rgba(27,55,38,.035)] transition hover:-translate-y-0.5 hover:border-[#a9bcae] hover:shadow-[0_14px_32px_rgba(27,55,38,.075)] sm:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f3ee] text-[#52685a]"><LockKeyhole size={19}/></span>
            <span className="mt-4 text-base font-bold tracking-tight text-[#20372a]">Sign in to your workspace</span>
            <span className="mt-1 text-xs leading-5 text-[#7d8b81]">Continue managing company details, listings and payments.</span>
            <span className="mt-auto flex items-center gap-2 pt-5 text-xs font-bold text-[#52685a]">Employer sign in <ArrowRight size={14} className="transition group-hover:translate-x-1"/></span>
          </a>

          <div className="rounded-2xl border border-dashed border-[#cbd8cc] bg-[#f1f5f0] p-5 sm:col-span-2 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#6a8973]"><CheckCircle2 size={18}/></span>
              <div>
                <p className="text-sm font-bold text-[#31463a]">Just want to submit a job?</p>
                <p className="mt-1 text-xs leading-5 text-[#7d8b81]">A standard listing can still be submitted without creating an account. Every submission is reviewed before publication.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onContinueWithoutAccount}
              className="mt-4 inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#183c32] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#285c4b] sm:mt-0"
            >
              Continue without account <ArrowRight size={14}/>
            </button>
          </div>

          <p className="px-1 text-[10px] leading-5 text-[#89958c] sm:col-span-2">
            New accounts are verified by email. Job submissions remain subject to PlanetAI review and approval before publication.
          </p>
        </div>
      </section>
    </div>
  );
};
