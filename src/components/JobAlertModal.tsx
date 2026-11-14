import React, {useState} from 'react';
import {Bell, CheckCircle2, Mail, Smartphone, X} from 'lucide-react';
import {JOB_CATEGORIES, JobCategory} from '../data/jobs';
import {sanitizeText} from '../utils/sanitize';

export interface AlertPreferences {
  email: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: Exclude<JobCategory, 'All'>[];
  updatedAt: string;
}

interface JobAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: AlertPreferences;
  onSavePreferences: (prefs: AlertPreferences) => void;
}

const ALERT_CATEGORIES = JOB_CATEGORIES.filter(
  (c): c is Exclude<JobCategory, 'All'> => c !== 'All'
);

export const JobAlertModal: React.FC<JobAlertModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
}) => {
  const [email, setEmail] = useState(preferences.email);
  const [emailEnabled, setEmailEnabled] = useState(preferences.emailEnabled);
  const [pushEnabled, setPushEnabled] = useState(preferences.pushEnabled);
  const [categories, setCategories] = useState<Exclude<JobCategory, 'All'>[]>(
    preferences.categories
  );
  const [pushStatus, setPushStatus] = useState<string>('');
  const [savedBanner, setSavedBanner] = useState(false);

  if (!isOpen) return null;

  const toggleCategory = (cat: Exclude<JobCategory, 'All'>) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };

  const handleTogglePush = async () => {
    if (!pushEnabled) {
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'denied') {
          setPushStatus(
            'Browser notifications are blocked. Enable them in site settings or use Email alerts.'
          );
          return;
        }
        if (Notification.permission === 'default') {
          try {
            const result = await Notification.requestPermission();
            if (result !== 'granted') {
              setPushStatus(
                'Permission dismissed. You can enable push alerts anytime.'
              );
              return;
            }
          } catch {
            // Fallback for WebView environments without Notification prompt
          }
        }
      }
      setPushStatus('Instant browser & PWA push alerts armed.');
      setPushEnabled(true);
    } else {
      setPushEnabled(false);
      setPushStatus('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeText(email, 160);
    if (emailEnabled && !cleanEmail) {
      setPushStatus('Please enter an email address or disable email alerts.');
      return;
    }

    onSavePreferences({
      email: cleanEmail,
      emailEnabled,
      pushEnabled,
      categories: categories.length > 0 ? categories : ALERT_CATEGORIES,
      updatedAt: new Date().toISOString(),
    });
    setSavedBanner(true);
    setTimeout(() => {
      setSavedBanner(false);
      onClose();
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-alerts-heading"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="job-alerts-heading"
                className="font-display text-lg font-bold text-slate-50"
              >
                Instant Job Alerts
              </h2>
              <p className="text-xs text-slate-400">
                Get notified when Micro1, Alignerr, Outlier, Mercor & others open batches
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close job alert settings"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Email Alerts */}
          <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-100">
                  Email Digest & Urgent Alerts
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailEnabled}
                onClick={() => setEmailEnabled((prev) => !prev)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  emailEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-slate-950 transition-transform ${
                    emailEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {emailEnabled && (
              <div className="mt-3">
                <label htmlFor="alert-email-input" className="sr-only">
                  Email address for job alerts
                </label>
                <input
                  id="alert-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Push Notifications */}
          <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="block text-sm font-semibold text-slate-100">
                    Push Notifications (Web & PWA)
                  </span>
                  <span className="block text-xs text-slate-400">
                    Real-time alerts when urgent cohorts drop
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pushEnabled}
                onClick={handleTogglePush}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  pushEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-slate-950 transition-transform ${
                    pushEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {pushStatus && (
              <p className="mt-2.5 text-xs text-cyan-300">{pushStatus}</p>
            )}
          </div>

          {/* Categories */}
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-2.5">
              Alert Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {ALERT_CATEGORIES.map((cat) => {
                const selected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                      selected
                        ? 'border-cyan-500/60 bg-cyan-950/60 text-cyan-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {savedBanner && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-3.5 py-2.5 text-xs font-medium text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Alert preferences saved!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 active:scale-[0.98] transition-all"
            >
              Subscribe to Alerts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
