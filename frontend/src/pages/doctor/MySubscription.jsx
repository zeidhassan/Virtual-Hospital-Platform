import { useState, useEffect } from 'react';
import { getMySubscription, getPlans, subscribeToPlan, updateMySubscription } from '@/api/doctor';
import { getFpxBanks, listPaymentMethods } from '@/api/payments';
import useFetch from '@/hooks/useFetch';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge, { statusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { Star, CheckCircle, RefreshCw, XCircle, ArrowLeft, CreditCard, Building2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const BRAND_BG = { visa: '#1A1F71', mastercard: '#EB001B', amex: '#007BC1', unknown: '#64748b' };
const detectBrand = (num) => { const n = String(num||'').replace(/\s/g,''); if(n.startsWith('4'))return'visa'; if(n.startsWith('5'))return'mastercard'; if(n.startsWith('3'))return'amex'; return'unknown'; };
const formatCardNum = (val) => val.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();

const CYCLE_LABEL = { monthly: 'Monthly', yearly: 'Yearly' };

// ── Plan card (step 1) ───────────────────────────────────────────────────────
const PlanCard = ({ plan, selected, onSelect, billingCycle }) => {
  const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
  const features = plan.features ? Object.entries(plan.features) : [];
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
        selected
          ? 'border-brand-600 bg-brand-50 shadow-md'
          : 'border-slate-200 hover:border-brand-300 hover:bg-surface-subtle'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-text-primary text-base">{plan.name}</p>
        <p className="text-brand-600 font-bold text-lg">
          {plan.currency || 'SAR'} {Number(price).toFixed(2)}
          <span className="text-xs font-normal text-text-muted">
            /{billingCycle === 'yearly' ? 'yr' : 'mo'}
          </span>
        </p>
      </div>
      {plan.description && (
        <p className="text-sm text-text-secondary mb-3">{plan.description}</p>
      )}
      {features.length > 0 && (
        <ul className="space-y-1">
          {features.map(([key, val]) => (
            <li key={key} className="flex items-center gap-2 text-xs text-text-secondary">
              <CheckCircle size={13} className={val ? 'text-emerald-500' : 'text-slate-300'} />
              <span className={!val ? 'line-through opacity-50' : ''}>{key.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
};

// ── Payment step (step 2) ────────────────────────────────────────────────────
const PaymentStep = ({ plan, billingCycle, onBack, onConfirm, submitting }) => {
  const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
  const currency = plan.currency || 'MYR';
  const cycleLabel = billingCycle === 'yearly' ? 'year' : 'month';

  const [fpxBanks, setFpxBanks] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [tab, setTab] = useState('fpx');
  const [fpxBank, setFpxBank] = useState('');
  const [cardMode, setCardMode] = useState('new');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cardNum, setCardNum] = useState('');
  const [holder, setHolder] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [saveCard, setSaveCard] = useState(false);

  useEffect(() => {
    Promise.all([getFpxBanks(), listPaymentMethods()]).then(([b, c]) => {
      setFpxBanks(b.data.banks || []);
      const cards = c.data.data || [];
      setSavedCards(cards);
      if (cards.length > 0) {
        setCardMode('saved');
        setSelectedCardId(cards.find(x => x.is_default)?.id || cards[0].id);
      }
    }).catch(() => {});
  }, []);

  const brand = detectBrand(cardNum);

  const getPaymentData = () => {
    if (tab === 'fpx') return { method_type: 'fpx', fpx_bank: fpxBank };
    if (cardMode === 'saved') return { method_type: 'card', payment_method_id: selectedCardId };
    return { method_type: 'card', card_number: cardNum, cardholder_name: holder, brand, exp_month: Number(expMonth), exp_year: Number(expYear), save_card: saveCard };
  };

  const handleConfirm = () => {
    if (tab === 'fpx' && !fpxBank) { toast.error('Select a bank'); return; }
    if (tab === 'card' && cardMode === 'saved' && !selectedCardId) { toast.error('Select a card'); return; }
    if (tab === 'card' && cardMode === 'new') {
      if (cardNum.replace(/\s/g,'').length < 13) { toast.error('Invalid card number'); return; }
      if (!expMonth || !expYear) { toast.error('Expiry date required'); return; }
    }
    onConfirm(getPaymentData());
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-600 mb-4">
        <ArrowLeft size={15} /> Back to plans
      </button>
      <h1 className="page-title mb-6">Payment Summary</h1>

      <div className="space-y-4 max-w-md">
        <Card>
          <CardHeader title="Order Summary" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">{plan.name} Plan</span>
              <span className="text-sm font-medium text-text-primary">{currency} {Number(price).toFixed(2)}/{cycleLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Billing cycle</span>
              <span className="text-sm text-text-primary capitalize">{billingCycle}</span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="font-semibold text-text-primary">Total due today</span>
              <span className="font-bold text-brand-600 text-lg">{currency} {Number(price).toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment Method" />
          <div className="space-y-3">
            <div className="flex gap-2">
              {[['fpx', Building2, 'Online Banking'], ['card', CreditCard, 'Card']].map(([id, Icon, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                    tab === id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-text-secondary hover:border-brand-300')}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>

            {tab === 'fpx' && (
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {fpxBanks.map((b) => (
                  <button key={b.id} onClick={() => setFpxBank(b.id)}
                    className={clsx('py-1.5 px-2 rounded-lg border text-xs font-medium text-left transition-all',
                      fpxBank === b.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-100 hover:border-brand-300 text-text-secondary')}>
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {tab === 'card' && (
              <div className="space-y-2">
                {savedCards.length > 0 && (
                  <div className="flex gap-2 mb-1">
                    {['saved','new'].map((m) => (
                      <button key={m} onClick={() => setCardMode(m)}
                        className={clsx('text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                          cardMode === m ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-text-secondary')}>
                        {m === 'saved' ? 'Saved' : 'New card'}
                      </button>
                    ))}
                  </div>
                )}
                {cardMode === 'saved' && savedCards.map((c) => (
                  <label key={c.id} className={clsx('flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors',
                    selectedCardId === c.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200')}>
                    <input type="radio" checked={selectedCardId === c.id} onChange={() => setSelectedCardId(c.id)} className="accent-brand-600" />
                    <div className="w-7 h-5 rounded text-white text-xs font-bold uppercase flex items-center justify-center" style={{ background: BRAND_BG[c.brand]||BRAND_BG.unknown }}>{c.brand?.slice(0,2)}</div>
                    <span className="text-xs text-text-primary">•••• {c.last4} · {c.exp_month}/{c.exp_year}</span>
                  </label>
                ))}
                {cardMode === 'new' && (
                  <div className="space-y-2">
                    <input type="text" inputMode="numeric" maxLength={19} value={cardNum} onChange={(e) => setCardNum(formatCardNum(e.target.value))}
                      placeholder="Card number" className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                    <input type="text" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Cardholder name"
                      className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min={1} max={12} value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="MM"
                        className="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                      <input type="number" min={2024} value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="YYYY"
                        className="text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                      <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="accent-brand-600" />
                      Save card for future use
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-text-muted pt-1">
              <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
              Subscription activated after admin approval. Payment is simulated.
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleConfirm} disabled={submitting} isLoading={submitting} className="flex-1">
            Confirm — {currency} {Number(price).toFixed(2)}
          </Button>
        </div>
        <p className="text-xs text-text-muted text-center">By subscribing you agree to the HelixaCare Terms of Service.</p>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
const MySubscription = () => {
  const { data: subData, isLoading: subLoading, error: subError, refetch: refetchSub } = useFetch(getMySubscription);
  const { data: plansData, isLoading: plansLoading } = useFetch(getPlans);

  const sub   = subData && !subError ? (subData.subscription || subData) : null;
  const plans = plansData?.data || plansData || [];

  // view: 'current' | 'selectPlan' | 'payment' | 'changePlan' | 'changePayment'
  const [view, setView]               = useState('current');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [billingCycle, setBillingCycle]     = useState('monthly');
  const [submitting, setSubmitting]         = useState(false);
  const [confirmCancel, setConfirmCancel]   = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSubscribe = async (paymentData) => {
    setSubmitting(true);
    try {
      await subscribeToPlan({ plan_id: selectedPlanId, billing_cycle: billingCycle, ...paymentData });
      toast.success('Subscription submitted — pending admin approval');
      setView('current');
      refetchSub();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to subscribe');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePlan = async (paymentData) => {
    if (!sub) return;
    setSubmitting(true);
    try {
      const res = await updateMySubscription(sub.id, {
        new_plan_id: selectedPlanId,
        new_billing_cycle: billingCycle,
      });
      toast.success(res.data?.message || 'Plan updated');
      setView('current');
      refetchSub();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!sub) return;
    setSubmitting(true);
    try {
      await updateMySubscription(sub.id, { cancel: true });
      toast.success('Subscription cancelled');
      setConfirmCancel(false);
      refetchSub();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const openSelectPlan = (initialCycle) => {
    setSelectedPlanId(null);
    setBillingCycle(initialCycle || 'monthly');
    setView('selectPlan');
  };

  const isLoading = subLoading || plansLoading;
  const noSub     = !subLoading && (subError || !sub);

  // ── Payment step ──────────────────────────────────────────────────────────
  if ((view === 'payment' || view === 'changePayment') && selectedPlan) {
    return (
      <PaymentStep
        plan={selectedPlan}
        billingCycle={billingCycle}
        onBack={() => setView(view === 'changePayment' ? 'changePlan' : 'selectPlan')}
        onConfirm={view === 'changePayment' ? handleChangePlan : handleSubscribe}
        submitting={submitting}
      />
    );
  }

  // ── Plan selection step ───────────────────────────────────────────────────
  if (view === 'selectPlan' || view === 'changePlan') {
    const isChange = view === 'changePlan';
    return (
      <div className="animate-fade-in max-w-2xl">
        <button
          onClick={() => setView('current')}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-600 mb-4"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <h1 className="page-title mb-6">{isChange ? 'Change Plan' : 'Choose a Plan'}</h1>

        {/* Billing cycle toggle */}
        <div className="flex items-center gap-2 mb-5">
          {['monthly', 'yearly'].map((c) => (
            <button
              key={c}
              onClick={() => setBillingCycle(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                billingCycle === c
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              {CYCLE_LABEL[c]}
              {c === 'yearly' && (
                <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  Save ~15%
                </span>
              )}
            </button>
          ))}
        </div>

        {plansLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-3 mb-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlanId === plan.id}
                onSelect={setSelectedPlanId}
                billingCycle={billingCycle}
              />
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => setView(isChange ? 'changePayment' : 'payment')}
            disabled={!selectedPlanId}
          >
            Continue to Payment
          </Button>
          <Button variant="ghost" onClick={() => setView('current')}>Cancel</Button>
        </div>
      </div>
    );
  }

  // ── Current subscription view ─────────────────────────────────────────────
  return (
    <div className="max-w-xl animate-fade-in">
      <h1 className="page-title mb-6">My Subscription</h1>

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

      {/* No subscription */}
      {!isLoading && noSub && (
        <Card>
          <CardHeader title="No Active Subscription" />
          <div className="py-6 text-center space-y-4">
            <p className="text-text-secondary text-sm">
              You don't have an active subscription yet. Choose a plan to get started.
            </p>
            <Button onClick={() => openSelectPlan('monthly')}>
              <Star size={15} className="mr-1.5" /> Browse Plans
            </Button>
          </div>
        </Card>
      )}

      {/* Active subscription */}
      {!isLoading && sub && (
        <Card>
          <CardHeader title="Current Plan" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
                <Star size={22} className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-lg">
                  {sub.plan_name || sub.plan?.name || 'Unknown Plan'}
                </p>
                <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-text-muted">Billing Cycle</p>
                <p className="text-sm font-medium text-text-primary mt-0.5 capitalize">
                  {sub.billing_cycle || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Price</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">
                  {sub.billing_cycle === 'yearly'
                    ? `SAR ${Number(sub.yearly_price || 0).toFixed(2)}/yr`
                    : `SAR ${Number(sub.monthly_price || 0).toFixed(2)}/mo`}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Start Date</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">
                  {sub.start_date ? format(new Date(sub.start_date), 'dd MMM yyyy') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">End Date</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">
                  {sub.end_date ? format(new Date(sub.end_date), 'dd MMM yyyy') : '—'}
                </p>
              </div>
              {sub.admin_notes && (
                <div className="col-span-2">
                  <p className="text-xs text-text-muted">Admin Notes</p>
                  <p className="text-sm text-text-secondary mt-0.5">{sub.admin_notes}</p>
                </div>
              )}
            </div>

            {/* Management actions */}
            {sub.status !== 'cancelled' && sub.status !== 'rejected' && (
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSelectPlan(sub.billing_cycle)}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Change Plan
                </Button>
                {!confirmCancel ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setConfirmCancel(true)}
                  >
                    <XCircle size={13} className="mr-1.5" /> Cancel Subscription
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">Are you sure?</span>
                    <button
                      onClick={handleCancel}
                      disabled={submitting}
                      className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                    >
                      {submitting ? 'Cancelling…' : 'Yes, cancel'}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(false)}
                      className="text-xs text-text-secondary hover:underline"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Resubscribe after cancel/reject */}
            {(sub.status === 'cancelled' || sub.status === 'rejected') && (
              <div className="pt-2 border-t border-slate-100">
                <Button size="sm" onClick={() => openSelectPlan('monthly')}>
                  <Star size={13} className="mr-1.5" /> Subscribe to a New Plan
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MySubscription;
