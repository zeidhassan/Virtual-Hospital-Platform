import { useState, useEffect } from 'react';
import { getMyBills, payBill, getFpxBanks, listPaymentMethods } from '@/api/payments';
import { submitInsuranceRequest, getMyPolicy } from '@/api/insurance';
import usePaginatedFetch from '@/hooks/usePaginatedFetch';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Pagination from '@/components/ui/Pagination';
import { CreditCard, Building2, CheckCircle2, Receipt, ChevronDown, ChevronUp, ShieldCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import PageHeader from '@/components/ui/PageHeader';

const STATUS_VARIANT = { pending: 'warning', paid: 'success', overdue: 'danger', cancelled: 'default', insurance_pending: 'info' };

const FPX_LOGOS = {
  maybank: '#FFCC00',
  cimb: '#CF0A2C',
  public_bank: '#003087',
  rhb: '#DB0011',
  hong_leong: '#005EB8',
  ambank: '#E31837',
  bank_islam: '#006341',
  bank_rakyat: '#005E3E',
  bank_muamalat: '#005E3E',
  affin_bank: '#004B87',
  alliance_bank: '#E30613',
  ocbc: '#E31837',
  standard_chartered: '#0072AA',
};

const BRAND_COLORS = { visa: '#1A1F71', mastercard: '#EB001B', amex: '#007BC1', unknown: '#64748b' };

const detectBrand = (num) => {
  const n = num.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (n.startsWith('5')) return 'mastercard';
  if (n.startsWith('3')) return 'amex';
  return 'unknown';
};

const formatCardNum = (val) => {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

// ── Inline Payment Form ────────────────────────────────────────────────────
const PaymentForm = ({ bill, fpxBanks, savedCards, activePolicy, onSuccess, onCancel }) => {
  const [tab, setTab] = useState('fpx');
  const [fpxBank, setFpxBank] = useState('');
  const [cardMode, setCardMode] = useState(savedCards.length > 0 ? 'saved' : 'new');
  const [selectedCardId, setSelectedCardId] = useState(savedCards.find((c) => c.is_default)?.id || savedCards[0]?.id || null);
  const [cardNum, setCardNum] = useState('');
  const [holder, setHolder] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const brand = detectBrand(cardNum);

  const handlePay = async () => {
    if (tab === 'insurance') {
      if (!activePolicy) {
        toast.error('No active insurance policy. Set one up in Insurance settings.');
        return;
      }
      setSubmitting(true);
      try {
        await submitInsuranceRequest({
          bill_id: bill.id,
          insurance_company: activePolicy.insurance_company,
          insurance_id_number: activePolicy.insurance_id_number,
          start_date: activePolicy.start_date?.slice(0, 10),
          end_date: activePolicy.end_date?.slice(0, 10),
        });
        toast.success('Insurance request submitted — your bill is pending review');
        onSuccess();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to submit insurance request');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (tab === 'fpx' && !fpxBank) {
      toast.error('Select a bank');
      return;
    }
    if (tab === 'card' && cardMode === 'new') {
      if (cardNum.replace(/\s/g, '').length < 13) {
        toast.error('Invalid card number');
        return;
      }
      if (!expMonth || !expYear) {
        toast.error('Expiry date required');
        return;
      }
    }
    if (tab === 'card' && cardMode === 'saved' && !selectedCardId) {
      toast.error('Select a card');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bill_id: bill.id,
        method_type: tab,
        ...(tab === 'fpx' ? { fpx_bank: fpxBank } : {}),
        ...(tab === 'card' && cardMode === 'saved' ? { payment_method_id: selectedCardId } : {}),
        ...(tab === 'card' && cardMode === 'new'
          ? {
              card_number: cardNum,
              cardholder_name: holder,
              brand,
              exp_month: Number(expMonth),
              exp_year: Number(expYear),
              save_card: saveCard,
            }
          : {}),
      };
      const { data } = await payBill(payload);
      toast.success(`Payment successful — Ref: ${data.transaction_ref}`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 space-y-4">
      <p className="text-sm font-medium text-text-primary">
        Pay <span className="text-brand-600 font-bold">MYR {Number(bill.amount).toFixed(2)}</span>
      </p>

      {/* Method tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('fpx')} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors', tab === 'fpx' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-text-secondary hover:border-brand-300')}>
          <Building2 size={15} /> Online Banking (FPX)
        </button>
        <button onClick={() => setTab('card')} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors', tab === 'card' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-text-secondary hover:border-brand-300')}>
          <CreditCard size={15} /> Debit / Credit Card
        </button>
        <button
          onClick={() => setTab('insurance')}
          className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors', tab === 'insurance' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-text-secondary hover:border-emerald-300')}
        >
          <ShieldCheck size={15} /> Insurance
        </button>
      </div>

      {/* FPX panel */}
      {tab === 'fpx' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {fpxBanks.map((b) => (
            <button key={b.id} onClick={() => setFpxBank(b.id)} className={clsx('py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all', fpxBank === b.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 hover:border-brand-300 text-text-secondary')}>
              <div className="w-4 h-4 rounded-sm mb-1 inline-block mr-1" style={{ background: FPX_LOGOS[b.id] || '#94a3b8' }} />
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Card panel */}
      {tab === 'card' && (
        <div className="space-y-3">
          {savedCards.length > 0 && (
            <div className="flex gap-2 mb-1">
              <button onClick={() => setCardMode('saved')} className={clsx('text-xs px-3 py-1 rounded-full border font-medium transition-colors', cardMode === 'saved' ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-text-secondary')}>
                Saved cards
              </button>
              <button onClick={() => setCardMode('new')} className={clsx('text-xs px-3 py-1 rounded-full border font-medium transition-colors', cardMode === 'new' ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-text-secondary')}>
                New card
              </button>
            </div>
          )}

          {cardMode === 'saved' && savedCards.length > 0 && (
            <div className="space-y-2">
              {savedCards.map((c) => (
                <label key={c.id} className={clsx('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors', selectedCardId === c.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-300')}>
                  <input type="radio" checked={selectedCardId === c.id} onChange={() => setSelectedCardId(c.id)} className="accent-brand-600" />
                  <div className="w-8 h-5 rounded flex items-center justify-center text-white text-xs font-bold uppercase" style={{ background: BRAND_COLORS[c.brand] || BRAND_COLORS.unknown }}>
                    {c.brand?.slice(0, 2) || '??'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">•••• {c.last4}</p>
                    <p className="text-xs text-text-muted">
                      {c.cardholder_name} · {c.exp_month}/{c.exp_year}
                    </p>
                  </div>
                  {c.is_default && (
                    <Badge variant="success" className="ml-auto text-xs">
                      Default
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          )}

          {cardMode === 'new' && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-text-secondary">Card Number</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={19}
                    value={cardNum}
                    onChange={(e) => setCardNum(formatCardNum(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  {cardNum.length > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase" style={{ color: BRAND_COLORS[brand] }}>
                      {brand !== 'unknown' ? brand : ''}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary">Cardholder Name</label>
                <input type="text" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Full name on card" className="w-full mt-1 text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Expiry Month</label>
                  <input type="number" min={1} max={12} value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="MM" className="w-full mt-1 text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">Expiry Year</label>
                  <input type="number" min={2024} value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="YYYY" className="w-full mt-1 text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="accent-brand-600" />
                Save card for future payments
              </label>
            </div>
          )}
        </div>
      )}

      {/* Insurance panel */}
      {tab === 'insurance' && (
        <div className="space-y-3">
          {activePolicy ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-900">{activePolicy.insurance_company}</p>
              </div>
              <p className="text-xs text-emerald-800 font-mono pl-6">{activePolicy.insurance_id_number}</p>
              <p className="text-xs text-emerald-700 pl-6">
                Coverage: {activePolicy.start_date?.slice(0, 10)} — {activePolicy.end_date?.slice(0, 10)}
              </p>
              <p className="text-xs text-emerald-600 pl-6 pt-1">
                Clicking "Submit Insurance Request" will create a verification request for this bill. It will be marked <strong>insurance pending</strong> until a doctor or admin approves.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">No active insurance policy</p>
                <p className="text-xs text-amber-700 mt-0.5">You need to save an insurance policy to your account before using this option.</p>
                <Link to="/patient/insurance" className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900">
                  Go to Insurance settings <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handlePay} isLoading={submitting} disabled={submitting} className="flex-1">
          {tab === 'insurance' ? 'Submit Insurance Request' : `Pay MYR ${Number(bill.amount).toFixed(2)}`}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-text-muted text-center">Payments are simulated — no real transaction occurs</p>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────
const BillingPayments = () => {
  const [fpxBanks, setFpxBanks] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);
  const [openPayBillId, setOpenPayBillId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  // Outstanding-balance summary needs every pending/overdue bill, not just the
  // current page, so it's tracked separately from the paginated list below.
  const [pendingBills, setPendingBills] = useState([]);

  const {
    data: filteredBills,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    setPage,
    refetch: reloadBills,
  } = usePaginatedFetch(getMyBills, { status: statusFilter !== 'all' ? statusFilter : undefined });

  const loadExtras = async () => {
    try {
      const [pendingRes, banksRes, cardsRes, policyRes] = await Promise.all([
        getMyBills({ status: 'pending', limit: 500 }),
        getFpxBanks(),
        listPaymentMethods(),
        getMyPolicy(),
      ]);
      const overdueRes = await getMyBills({ status: 'overdue', limit: 500 });
      setPendingBills([...(pendingRes.data.data || []), ...(overdueRes.data.data || [])]);
      setFpxBanks(banksRes.data.banks || []);
      setSavedCards(cardsRes.data.data || []);
      setActivePolicy(policyRes.data.policy || null);
    } catch {
      // Non-critical extras (summary total, FPX banks, saved cards, policy) —
      // the main bills list above still loads and shows its own error state.
    }
  };

  useEffect(() => {
    loadExtras();
  }, []);

  const load = () => {
    reloadBills();
    loadExtras();
  };

  const pendingTotal = pendingBills.reduce((s, b) => s + Number(b.amount), 0);

  const statusBorderColor = (status) => {
    if (status === 'paid') return 'border-l-green-500';
    if (status === 'pending') return 'border-l-amber-500';
    if (status === 'overdue') return 'border-l-red-500';
    if (status === 'insurance_pending') return 'border-l-blue-500';
    return 'border-l-slate-300';
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Billing & Payments" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && (
        <>
          {/* Summary */}
          {pendingTotal > 0 && (
            <Card className="bg-amber-50 border border-amber-200 !p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Receipt size={24} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">Outstanding Balance</p>
                  <p className="text-2xl font-extrabold text-amber-800 tracking-tight">RM {pendingTotal.toFixed(2)}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{pendingBills.length} unpaid bill(s)</p>
                </div>
              </div>
            </Card>
          )}

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'pending', 'paid', 'overdue', 'insurance_pending', 'cancelled'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors capitalize', statusFilter === filter ? 'bg-brand-600 text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-warm border border-slate-200')}
              >
                {filter.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Bills list */}
          <Card>
            {filteredBills.length === 0 ? (
              <EmptyState icon={Receipt} title="No bills" description="Bills will appear here after appointments or orders." />
            ) : (
              <div className="space-y-3">
                {filteredBills.map((bill) => (
                  <div key={bill.id} className={clsx('rounded-xl border-l-[5px] bg-surface-subtle hover:bg-surface-warm transition-colors', statusBorderColor(bill.status))}>
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-[46px] h-[46px] rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Receipt size={22} className="text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <p className="text-xs font-mono text-text-muted">#{bill.id}</p>
                              <p className="text-sm font-semibold text-text-primary">{bill.details || 'Medical Bill'}</p>
                            </div>
                            <Badge variant={STATUS_VARIANT[bill.status] || 'default'}>{bill.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-text-muted mb-2">
                            <span>{bill.billing_date ? format(new Date(bill.billing_date), 'dd MMM yyyy') : '—'}</span>
                            <span>•</span>
                            <span className="font-bold text-text-primary text-base">RM {Number(bill.amount).toFixed(2)}</span>
                          </div>
                          {bill.last_transaction && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 w-fit">
                              <CheckCircle2 size={12} />
                              Paid via {bill.last_transaction.method_type === 'fpx' ? `FPX (${bill.last_transaction.fpx_bank})` : 'Card'} · {bill.last_transaction.transaction_ref}
                            </div>
                          )}
                        </div>
                        {(bill.status === 'pending' || bill.status === 'overdue') && (
                          <Button size="sm" onClick={() => setOpenPayBillId(openPayBillId === bill.id ? null : bill.id)} className="flex-shrink-0">
                            {openPayBillId === bill.id ? (
                              <>
                                <ChevronUp size={14} className="mr-1" /> Hide
                              </>
                            ) : (
                              <>
                                <CreditCard size={14} className="mr-1" /> Pay
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {openPayBillId === bill.id && (
                      <PaymentForm
                        bill={bill}
                        fpxBanks={fpxBanks}
                        savedCards={savedCards}
                        activePolicy={activePolicy}
                        onSuccess={() => {
                          setOpenPayBillId(null);
                          load();
                        }}
                        onCancel={() => setOpenPayBillId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </Card>
        </>
      )}
    </div>
  );
};

export default BillingPayments;
