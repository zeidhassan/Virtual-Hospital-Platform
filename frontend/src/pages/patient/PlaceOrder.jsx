import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMedications, placeOrder } from '@/api/pharmacy';
import { getActiveInsurance } from '@/api/insurance';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { ShoppingCart, Plus, Minus, Package } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash on Delivery' },
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'insurance', label: 'Insurance Coverage' },
];

const PlaceOrder = () => {
  const navigate = useNavigate();
  const [medications, setMedications] = useState([]);
  // cart: { [medId]: { id, name, type, price, quantity } }
  const [cart, setCart] = useState({});
  const [file, setFile] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [insurance, setInsurance] = useState(null); // { hasInsurance, insurance }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      getMedications({ limit: 100 }),
      getActiveInsurance(),
    ])
      .then(([medsRes, insRes]) => {
        setMedications(medsRes.data?.data || medsRes.data || []);
        setInsurance(insRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const qty = (id) => cart[id]?.quantity || 0;

  const increment = (med) => {
    setCart((prev) => ({
      ...prev,
      [med.id]: {
        id: med.id,
        name: med.name,
        type: med.type,
        price: parseFloat(med.price),
        quantity: (prev[med.id]?.quantity || 0) + 1,
      },
    }));
  };

  const decrement = (id) => {
    setCart((prev) => {
      const current = prev[id]?.quantity || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...prev[id], quantity: current - 1 } };
    });
  };

  const selectedItems = Object.values(cart).filter((m) => m.quantity > 0);
  const requiresFile = selectedItems.some((m) => m.type === 'prescription');
  const totalAmount = selectedItems.reduce((sum, m) => sum + m.price * m.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error('Add at least one medication to your order.');
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address.');
      return;
    }
    if (requiresFile && !file) {
      toast.error('A prescription file is required for the selected medication(s).');
      return;
    }
    if (paymentMethod === 'insurance' && !insurance?.hasInsurance) {
      toast.error('You do not have active insurance coverage.');
      return;
    }

    setSubmitting(true);
    try {
      const names = selectedItems.map((m) => m.name);
      const quantities = selectedItems.map((m) => m.quantity);
      const insuranceId = paymentMethod === 'insurance' ? insurance?.insurance?.id : null;

      await placeOrder(names, quantities, file, deliveryAddress.trim(), paymentMethod, insuranceId);
      toast.success('Order placed successfully!');
      navigate('/patient/my-orders');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const countertop = medications.filter((m) => m.type !== 'prescription');
  const prescription = medications.filter((m) => m.type === 'prescription');

  const MedCard = ({ med }) => {
    const count = qty(med.id);
    return (
      <div
        className={`flex gap-3 p-3 rounded-lg border transition-colors ${
          count > 0 ? 'border-brand-400 bg-brand-50' : 'border-slate-200'
        }`}
      >
        {/* Photo */}
        <div className="w-14 h-14 flex-shrink-0 rounded-md bg-slate-100 overflow-hidden flex items-center justify-center">
          {med.photo_url ? (
            <img src={`/${med.photo_url}`} alt={med.name} className="w-full h-full object-cover" />
          ) : (
            <Package size={24} className="text-slate-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-text-primary">{med.name}</p>
            {med.type === 'prescription' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                Rx
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">SAR {parseFloat(med.price).toFixed(2)}</p>
        </div>

        {/* Qty controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {count > 0 ? (
            <>
              <button
                type="button"
                onClick={() => decrement(med.id)}
                className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100"
              >
                <Minus size={12} />
              </button>
              <span className="text-sm font-semibold w-5 text-center">{count}</span>
              <button
                type="button"
                onClick={() => increment(med)}
                className="w-7 h-7 rounded-full border border-brand-400 bg-brand-50 flex items-center justify-center text-brand-600 hover:bg-brand-100"
              >
                <Plus size={12} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => increment(med)}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-brand-400 text-brand-600 hover:bg-brand-50"
            >
              Add
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <h1 className="page-title mb-6">Place a Pharmacy Order</h1>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : medications.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No medications available" description="The medication catalog is currently empty." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Over-the-counter */}
          {countertop.length > 0 && (
            <Card>
              <CardHeader title="Over-the-counter" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {countertop.map((med) => <MedCard key={med.id} med={med} />)}
              </div>
            </Card>
          )}

          {/* Prescription-only */}
          {prescription.length > 0 && (
            <Card>
              <CardHeader title="Prescription only" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {prescription.map((med) => <MedCard key={med.id} med={med} />)}
              </div>
            </Card>
          )}

          {/* Order summary */}
          {selectedItems.length > 0 && (
            <Card>
              <CardHeader title="Order Summary" />
              <ul className="space-y-1.5 text-sm">
                {selectedItems.map((m) => (
                  <li key={m.id} className="flex justify-between text-text-secondary">
                    <span>{m.name} {m.type === 'prescription' && <span className="text-amber-700 font-semibold text-xs">Rx</span>} × {m.quantity}</span>
                    <span className="font-medium text-text-primary">SAR {(m.price * m.quantity).toFixed(2)}</span>
                  </li>
                ))}
                <li className="flex justify-between font-semibold text-text-primary border-t border-border pt-2 mt-2">
                  <span>Total</span>
                  <span>SAR {totalAmount.toFixed(2)}</span>
                </li>
              </ul>
            </Card>
          )}

          {/* Prescription file upload */}
          {requiresFile && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
              <p className="text-sm font-semibold text-amber-800">
                Prescription File Required <span className="text-red-600">*</span>
              </p>
              <p className="text-xs text-amber-700">One or more selected medications require a valid doctor's prescription.</p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files[0])}
                required
                className="block w-full text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-600 file:text-white file:font-medium hover:file:bg-amber-700 file:cursor-pointer"
              />
              {file && <p className="text-xs text-amber-700">Selected: {file.name}</p>}
            </div>
          )}

          {/* Delivery address */}
          <Card>
            <CardHeader title="Delivery Details" />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Delivery Address <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your full delivery address..."
                  required
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>

              {/* Payment method */}
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">Payment Method</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const isInsurance = pm.value === 'insurance';
                    const disabled = isInsurance && !insurance?.hasInsurance;
                    return (
                      <label
                        key={pm.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          disabled ? 'opacity-40 cursor-not-allowed border-slate-200' :
                          paymentMethod === pm.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={pm.value}
                          checked={paymentMethod === pm.value}
                          disabled={disabled}
                          onChange={() => setPaymentMethod(pm.value)}
                          className="accent-brand-600"
                        />
                        <span className="text-sm text-text-primary">{pm.label}</span>
                        {isInsurance && insurance?.hasInsurance && (
                          <span className="ml-auto text-xs text-green-700 font-medium bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                        {isInsurance && !insurance?.hasInsurance && (
                          <span className="ml-auto text-xs text-slate-500">(No active coverage)</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-3 pb-6">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" isLoading={submitting} disabled={selectedItems.length === 0 || submitting}>
              Place Order {selectedItems.length > 0 && `(SAR ${totalAmount.toFixed(2)})`}
            </Button>
          </div>

        </form>
      )}
    </div>
  );
};

export default PlaceOrder;
