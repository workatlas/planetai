import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, ExternalLink, Globe2, LoaderCircle, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Payment = { status: string; amount: number; currency: string; provider_order_id: string | null; confirmed_at: string | null };
type Listing = { id: string; reference_code: string; job_title: string; company_name: string; package_tier: string; status: string; submitted_at: string; payment: Payment | null };

const tierName = (tier: string) => tier === 'featured' ? 'Featured Boost' : tier === 'spotlight' ? 'Spotlight + Marquee' : 'Free Standard';
const priceFor = (tier: string) => tier === 'featured' ? 49 : tier === 'spotlight' ? null : 0;
const statusLabel = (status: string) => ({
  pending_review: 'In moderation', email_verification_pending: 'Email verification pending',
  approved_awaiting_payment: 'Approved · Payment required', ready_to_publish: 'Ready to publish',
  published: 'Published', rejected: 'Not approved', expired: 'Expired',
}[status] || status.replaceAll('_', ' '));

export default function EmployerPayments() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadListings = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: requestError } = await supabase.functions.invoke('employer-workspace', { body: { action: 'list' } });
    if (requestError) setError(requestError.message || 'We could not load your listings.');
    else if (data?.listings) setListings(data.listings as Listing[]);
    else setError(data?.error || 'Your employer listings could not be loaded.');
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) { window.location.replace('/?experience=employer-auth'); return; }
      await loadListings();
    };
    void load();
    return () => { active = false; };
  }, [loadListings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const submissionId = params.get('submission_id');
    const orderId = params.get('token');
    if (paymentStatus === 'success' && submissionId && orderId) {
      let active = true;
      setBusyId(submissionId); setError(''); setNotice('Confirming your PayPal payment securely…');
      void supabase.functions.invoke('paypal-listing-checkout', {
        body: { action: 'capture-order', submission_id: submissionId, order_id: orderId },
      }).then(async ({ data, error: captureError }) => {
        if (!active) return;
        if (captureError || !data?.paid) setError(data?.error || captureError?.message || 'We could not confirm this payment. Please contact support before trying again.');
        else if (data.publication_pending) setNotice('Payment verified. Your listing is awaiting final publication review by our team.');
        else setNotice('Payment confirmed! Your promoted listing is now published.');
        const clean = new URL(window.location.href);
        clean.searchParams.delete('payment'); clean.searchParams.delete('submission_id'); clean.searchParams.delete('token'); clean.searchParams.delete('PayerID');
        window.history.replaceState({}, '', clean.pathname + clean.search);
        await loadListings();
        setBusyId('');
      });
      return () => { active = false; };
    }
    if (paymentStatus === 'cancelled') {
      setNotice('Checkout was cancelled. No payment was confirmed; you can return to checkout whenever you are ready.');
      const clean = new URL(window.location.href); clean.searchParams.delete('payment'); clean.searchParams.delete('submission_id');
      window.history.replaceState({}, '', clean.pathname + clean.search);
    }
  }, [loadListings]);

  async function startCheckout(listing: Listing) {
    setBusyId(listing.id); setError(''); setNotice('');
    try {
      const { data, error: requestError } = await supabase.functions.invoke('paypal-listing-checkout', {
        body: { action: 'create-order', submission_id: listing.id },
      });
      if (requestError) throw new Error(requestError.message || 'PayPal checkout could not be started.');
      if (!data?.approve_url) throw new Error(data?.error || 'PayPal did not return a secure approval link.');
      window.location.assign(data.approve_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout.');
      setBusyId('');
    }
  }

  async function retryPublication(listing: Listing) {
    if (!listing.payment?.provider_order_id) return;
    setBusyId(listing.id); setError(''); setNotice('Retrying publication for your verified payment…');
    const { data, error: requestError } = await supabase.functions.invoke('paypal-listing-checkout', {
      body: { action: 'capture-order', submission_id: listing.id, order_id: listing.payment.provider_order_id },
    });
    if (requestError || !data?.paid || !data?.published) {
      setError(data?.error || requestError?.message || 'Payment is confirmed, but publication still needs attention. Please try again shortly.');
    } else setNotice('Your verified payment has been reconciled and the listing is published.');
    await loadListings();
    setBusyId('');
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace('/?experience=employer-auth');
  }

  return <div className="min-h-screen bg-[#f4f7fb] text-[#17243a]">
    <header className="border-b border-[#e4eaf2] bg-white">
      <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#172b49] text-white"><Globe2 size={20}/></span><span><b className="block text-sm tracking-[-.05em]">PLANETAI</b><small className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#8997aa]">Employer billing</small></span></a>
        <button onClick={signOut} className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b]"><LogOut size={14}/> Sign out</button>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8">
      <a href="/?experience=employer-auth" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b]"><ArrowLeft size={14}/> Employer workspace</a>
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#315a91]"><ShieldCheck size={14}/> Secure listing payments</span><h1 className="mt-4 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Listings & payments</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#718096]">Track moderation, pay only after approval, and follow your listing through publication.</p></div>
        <button onClick={loadListings} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#dce5f0] bg-white px-4 py-3 text-xs font-bold text-[#315a91] disabled:opacity-50"><RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh</button>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e4eaf2] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9ab0]">Your listings</p><p className="mt-2 text-3xl font-semibold">{listings.length}</p></div>
        <div className="rounded-2xl border border-[#e4eaf2] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9ab0]">Awaiting review</p><p className="mt-2 text-3xl font-semibold">{listings.filter(item=>item.status==='pending_review').length}</p></div>
        <div className="rounded-2xl border border-[#e4eaf2] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9ab0]">Payment due</p><p className="mt-2 text-3xl font-semibold">{listings.filter(item=>item.status==='approved_awaiting_payment').length}</p></div>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      <section className="mt-7 space-y-4">
        {loading ? <div className="rounded-2xl border border-[#e4eaf2] bg-white p-12 text-center text-sm text-[#718096]"><LoaderCircle className="mx-auto mb-3 animate-spin" size={22}/> Loading your employer listings…</div>
          : listings.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cbd7e6] bg-white p-12 text-center"><CreditCard className="mx-auto text-[#7890ae]" size={28}/><h2 className="mt-4 text-lg font-semibold">No listings yet</h2><p className="mt-2 text-sm text-[#8795aa]">Your submitted roles will appear here, along with moderation and payment updates.</p><a href="/" className="mt-5 inline-flex rounded-xl bg-[#172b49] px-5 py-3 text-xs font-bold text-white">Browse PLANETAI</a></div>
          : listings.map(listing => {
            const amount = priceFor(listing.package_tier);
            const canPay = listing.status === 'approved_awaiting_payment' && amount > 0 && listing.payment?.status !== 'completed';
            return <article key={listing.id} className="rounded-2xl border border-[#e4eaf2] bg-white p-5 shadow-[0_8px_30px_rgba(28,52,84,.035)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#edf3fb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#315a91]">{tierName(listing.package_tier)}</span><span className="text-[10px] text-[#9aa8ba]">{listing.reference_code}</span></div><h2 className="mt-3 text-lg font-semibold">{listing.job_title}</h2><p className="mt-1 text-xs text-[#8795aa]">{listing.company_name} · Submitted {new Date(listing.submitted_at).toLocaleDateString()}</p></div>
                <div className="text-right"><p className="text-xl font-semibold">{amount === null ? 'Coming soon' : amount > 0 ? '$' + amount.toFixed(2) : 'Free'}</p><p className="mt-1 text-[10px] text-[#9aa8ba]">{amount === null ? 'Marquee placement is not yet available' : amount > 0 ? 'USD · one-time listing upgrade' : 'No payment required'}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f6] pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#52627a]"><Clock3 size={15}/>{statusLabel(listing.status)}</div>
                {listing.payment?.status === 'completed' ? listing.status === 'published' ? <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 size={15}/> Payment confirmed · Published</span> : <button onClick={()=>retryPublication(listing)} disabled={busyId===listing.id} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 disabled:opacity-60">{busyId===listing.id?<LoaderCircle className="animate-spin" size={14}/>:<RefreshCw size={14}/>} Retry publication</button>
                  : canPay ? <button onClick={()=>startCheckout(listing)} disabled={busyId===listing.id} className="inline-flex items-center gap-2 rounded-xl bg-[#172b49] px-4 py-3 text-xs font-bold text-white disabled:opacity-60">{busyId===listing.id?<LoaderCircle className="animate-spin" size={14}/>:<CreditCard size={14}/>} Pay securely with PayPal <ExternalLink size={13}/></button>
                  : listing.status==='rejected' ? <span className="text-xs text-rose-600">No payment is due.</span>
                  : <span className="text-[10px] text-[#9aa8ba]">{listing.status==='published'?'Your listing is live.':listing.status==='approved_awaiting_payment'?'Payment can be completed once checkout is available.':'We will unlock payment here after approval.'}</span>}
              </div>
              {listing.payment?.status==='completed' && <p className="mt-3 text-[10px] text-[#8795aa]">Payment recorded{listing.payment.confirmed_at ? ' on '+new Date(listing.payment.confirmed_at).toLocaleString() : ''}. Your payment is linked to this listing.</p>}
            </article>;
          })}
      </section>
      <p className="mt-8 text-[10px] leading-5 text-[#9aa8ba]">PLANETAI never applies paid visibility before moderation approval and server-side payment confirmation. Employer verification is separate and cannot be purchased.</p>
    </main>
  </div>;
}
+amount.toFixed(2) : 'Free'}</p><p className="mt-1 text-[10px] text-[#9aa8ba]">{amount ? 'USD · one-time listing upgrade' : 'No payment required'}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f6] pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#52627a]"><Clock3 size={15}/>{statusLabel(listing.status)}</div>
                {listing.payment?.status === 'completed' ? listing.status === 'published' ? <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 size={15}/> Payment confirmed · Published</span> : <button onClick={()=>retryPublication(listing)} disabled={busyId===listing.id} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 disabled:opacity-60">{busyId===listing.id?<LoaderCircle className="animate-spin" size={14}/>:<RefreshCw size={14}/>} Retry publication</button>
                  : canPay ? <button onClick={()=>startCheckout(listing)} disabled={busyId===listing.id} className="inline-flex items-center gap-2 rounded-xl bg-[#172b49] px-4 py-3 text-xs font-bold text-white disabled:opacity-60">{busyId===listing.id?<LoaderCircle className="animate-spin" size={14}/>:<CreditCard size={14}/>} Pay securely with PayPal <ExternalLink size={13}/></button>
                  : listing.status==='rejected' ? <span className="text-xs text-rose-600">No payment is due.</span>
                  : <span className="text-[10px] text-[#9aa8ba]">{listing.status==='published'?'Your listing is live.':listing.status==='approved_awaiting_payment'?'Payment can be completed once checkout is available.':'We will unlock payment here after approval.'}</span>}
              </div>
              {listing.payment?.status==='completed' && <p className="mt-3 text-[10px] text-[#8795aa]">Payment recorded{listing.payment.confirmed_at ? ' on '+new Date(listing.payment.confirmed_at).toLocaleString() : ''}. Your payment is linked to this listing.</p>}
            </article>;
          })}
      </section>
      <p className="mt-8 text-[10px] leading-5 text-[#9aa8ba]">PLANETAI never applies paid visibility before moderation approval and server-side payment confirmation. Employer verification is separate and cannot be purchased.</p>
    </main>
  </div>;
}
 + amount.toFixed(2) : 'Free'}</p><p className="mt-1 text-[10px] text-[#9aa8ba]">{amount === null ? 'Marquee placement is not yet available' : amount > 0 ? 'USD · one-time listing upgrade' : 'No payment required'}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f6] pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#52627a]"><Clock3 size={15}/>{statusLabel(listing.status)}</div>
                {listing.payment?.status === 'completed' ? listing.status === 'published' ? <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 size={15}/> Payment confirmed · Published</span> : <button onClick={()=>retryPublication(listing)} disabled={busyId===listing.id} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 disabled:opacity-60">{busyId===listing.id?<LoaderCircle className="animate-spin" size={14}/>:<RefreshCw size={14}/>} Retry publication</button>
                  : canPay ? <button onClick={()=>startCheckout(listing)} disabled={busyId===listing.id} className="inline-flex items-center gap-2 rounded-xl bg-[#172b49] px-4 py-3 text-xs font-bold text-white disabled:opacity-60">{busyId===listing.id?<LoaderCircle className="animate-spin" size={14}/>:<CreditCard size={14}/>} Pay securely with PayPal <ExternalLink size={13}/></button>
                  : listing.status==='rejected' ? <span className="text-xs text-rose-600">No payment is due.</span>
                  : <span className="text-[10px] text-[#9aa8ba]">{listing.status==='published'?'Your listing is live.':listing.status==='approved_awaiting_payment'?'Payment can be completed once checkout is available.':'We will unlock payment here after approval.'}</span>}
              </div>
              {listing.payment?.status==='completed' && <p className="mt-3 text-[10px] text-[#8795aa]">Payment recorded{listing.payment.confirmed_at ? ' on '+new Date(listing.payment.confirmed_at).toLocaleString() : ''}. Your payment is linked to this listing.</p>}
            </article>;
          })}
      </section>
      <p className="mt-8 text-[10px] leading-5 text-[#9aa8ba]">PLANETAI never applies paid visibility before moderation approval and server-side payment confirmation. Employer verification is separate and cannot be purchased.</p>
    </main>
  </div>;
}
+amount.toFixed(2) : 'Free'}</p><p className="mt-1 text-[10px] text-[#9aa8ba]">{amount ? 'USD · one-time listing upgrade' : 'No payment required'}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f6] pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#52627a]"><Clock3 size={15}/>{statusLabel(listing.status)}</div>
                {listing.payment?.status === 'completed' ? listing.status === 'published' ? <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 size={15}/> Payment confirmed · Published</span> : <button onClick={()=>retryPublication(listing)} disabled={busyId===listing.id} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 disabled:opacity-60">{busyId===listing.id?<LoaderCircle className="animate-spin" size={14}/>:<RefreshCw size={14}/>} Retry publication</button>
                  : canPay ? <button onClick={()=>startCheckout(listing)} disabled={busyId===listing.id} className="inline-flex items-center gap-2 rounded-xl bg-[#172b49] px-4 py-3 text-xs font-bold text-white disabled:opacity-60">{busyId===listing.id?<LoaderCircle className="animate-spin" size={14}/>:<CreditCard size={14}/>} Pay securely with PayPal <ExternalLink size={13}/></button>
                  : listing.status==='rejected' ? <span className="text-xs text-rose-600">No payment is due.</span>
                  : <span className="text-[10px] text-[#9aa8ba]">{listing.status==='published'?'Your listing is live.':listing.status==='approved_awaiting_payment'?'Payment can be completed once checkout is available.':'We will unlock payment here after approval.'}</span>}
              </div>
              {listing.payment?.status==='completed' && <p className="mt-3 text-[10px] text-[#8795aa]">Payment recorded{listing.payment.confirmed_at ? ' on '+new Date(listing.payment.confirmed_at).toLocaleString() : ''}. Your payment is linked to this listing.</p>}
            </article>;
          })}
      </section>
      <p className="mt-8 text-[10px] leading-5 text-[#9aa8ba]">PLANETAI never applies paid visibility before moderation approval and server-side payment confirmation. Employer verification is separate and cannot be purchased.</p>
    </main>
  </div>;
}
