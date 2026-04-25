import { useState, useEffect } from 'react';
import { listPaymentMethods, savePaymentMethod, setDefaultMethod, deletePaymentMethod } from '@/api/payments';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { CreditCard, Plus, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const BRAND_BG = { visa: '#1A1F71', mastercard: '#EB001B', amex: '#007BC1', unknown: '#64748b' };

const detectBrand = (num) => {
  const n = String(num || '').replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (n.startsWith('5')) return 'mastercard';
  if (n.startsWith('3')) return 'amex';
  return 'unknown';
};

const formatCardNum = (val) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const inputCls = 'w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300';

const PaymentMethods = () => {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [defaulting, setDefaulting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [cardNum, setCardNum] = useState('');
  const [holder, setHolder] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [setDefault, setSetDefault] = useState(false);

  const brand = detectBrand(cardNum);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data } = await listPaymentMethods();
      setCards(data.data || []);
    } catch {
      toast.error('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const raw = cardNum.replace(/\s/g, '');
    if (raw.length < 13) { toast.error('Invalid card number'); return; }
    if (!expMonth || !expYear) { toast.error('Expiry date required'); return; }

    setSaving(true);
    try {
      await savePaymentMethod({
        card_number: raw,
        cardholder_name: holder,
        brand,
        exp_month: Number(expMonth),
        exp_year: Number(expYear),
        set_default: setDefault,
      });
      toast.success('Card saved');
      setShowForm(false);
      setCardNum(''); setHolder(''); setExpMonth(''); setExpYear(''); setSetDefault(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id) => {
    setDefaulting(id);
    try {
      await setDefaultMethod(id);
      toast.success('Default card updated');
      load();
    } catch {
      toast.error('Failed to update default');
    } finally {
      setDefaulting(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this card?')) return;
    setRemoving(id);
    try {
      await deletePaymentMethod(id);
      toast.success('Card removed');
      load();
    } catch {
      toast.error('Failed to remove card');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Payment Methods</h1>
        <Button size="sm" onClick={() => setShowForm((p) => !p)}>
          <Plus size={14} className="mr-1.5" /> Add Card
        </Button>
      </div>

      {/* Add card form */}
      {showForm && (
        <Card>
          <CardHeader title="Add New Card" />
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Card Number</label>
              <div className="relative mt-1">
                <input
                  type="text" inputMode="numeric" maxLength={19}
                  value={cardNum} onChange={(e) => setCardNum(formatCardNum(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  className={clsx(inputCls, 'pr-20')}
                />
                {cardNum.length > 0 && brand !== 'unknown' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase" style={{ color: BRAND_BG[brand] }}>{brand}</span>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Cardholder Name</label>
              <input type="text" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Name on card" className={clsx(inputCls, 'mt-1')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary">Expiry Month</label>
                <input type="number" min={1} max={12} value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="MM" className={clsx(inputCls, 'mt-1')} />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary">Expiry Year</label>
                <input type="number" min={2024} value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="YYYY" className={clsx(inputCls, 'mt-1')} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} className="accent-brand-600" />
              Set as default card
            </label>
            <div className="flex gap-3 pt-1">
              <Button onClick={handleSave} isLoading={saving} disabled={saving}>Save Card</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Cards list */}
      <Card>
        <CardHeader title="Saved Cards" />
        {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
        {!isLoading && cards.length === 0 && (
          <EmptyState icon={CreditCard} title="No saved cards" description="Add a card to speed up future payments." />
        )}
        {!isLoading && cards.length > 0 && (
          <div className="space-y-3">
            {cards.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-surface-subtle">
                {/* Card chip */}
                <div className="w-12 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold uppercase flex-shrink-0" style={{ background: BRAND_BG[c.brand] || BRAND_BG.unknown }}>
                  {c.brand?.slice(0, 2) || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">•••• •••• •••• {c.last4}</p>
                  <p className="text-xs text-text-muted">{c.cardholder_name} · Expires {c.exp_month}/{c.exp_year}</p>
                </div>
                {c.is_default && <Badge variant="success" className="flex-shrink-0">Default</Badge>}
                <div className="flex gap-1 flex-shrink-0">
                  {!c.is_default && (
                    <button
                      onClick={() => handleSetDefault(c.id)}
                      disabled={defaulting === c.id}
                      className="p-1.5 rounded-lg text-text-muted hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40"
                      title="Set as default"
                    >
                      <Star size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={removing === c.id}
                    className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    title="Remove card"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PaymentMethods;
