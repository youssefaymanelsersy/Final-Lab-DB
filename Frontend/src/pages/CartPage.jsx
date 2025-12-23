import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';

import '../Styles/CartPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function CartPage({ user }) {
  const navigate = useNavigate();
  const customerId = user?.id;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyIsbn, setBusyIsbn] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // VISA ONLY
  const [cardNumber, setCardNumber] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');

  const isEmpty = items.length === 0;

  const formatMoney = (n) => {
    const v = typeof n === 'number' ? n : parseFloat(n);
    const safe = Number.isFinite(v) ? v : 0;
    return safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const normalizeItems = (data) => {
    const arr = data?.items ?? data?.data?.items ?? data?.data ?? [];
    return Array.isArray(arr) ? arr : [];
  };

  const lineTotal = (it) => {
    const price = parseFloat(it.selling_price ?? it.price ?? 0);
    const qty = parseInt(it.qty ?? 0, 10);
    const t1 = parseFloat(it.total);
    const t2 = parseFloat(it.line_total);
    if (Number.isFinite(t1)) return t1;
    if (Number.isFinite(t2)) return t2;
    const calc = price * qty;
    return Number.isFinite(calc) ? calc : 0;
  };

  const subtotal = useMemo(() => {
    const sum = items.reduce((acc, it) => acc + lineTotal(it), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [items]);

  const loadCart = async (signal) => {
    if (!customerId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/cart`, {
        credentials: 'include',
        signal,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || 'Failed to load cart');
      setItems(normalizeItems(data));
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadCart(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const getQty = (isbn) => items.find((x) => x.isbn === isbn)?.qty || 0;

  // Cart endpoints:
  // POST   /api/customers/:id/cart { isbn, qty }  (adds/increments)
  // DELETE /api/customers/:id/cart/:isbn         (removes)
  //
  // To set exact qty: delete then re-add desired qty
  const addOne = async (isbn) => {
    if (!customerId) return;
    setBusyIsbn(isbn);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isbn, qty: 1 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || 'Failed to add');
      const ctrl = new AbortController();
      await loadCart(ctrl.signal);
    } catch (e) {
      setError(e.message || 'Failed');
    } finally {
      setBusyIsbn('');
    }
  };

  const setExactQty = async (isbn, qty) => {
    if (!customerId) return;
    const nextQty = Math.max(0, Number(qty || 0));
    setBusyIsbn(isbn);
    setError('');
    setSuccess('');
    try {
      await fetch(`${API_BASE}/api/customers/${customerId}/cart/${isbn}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (nextQty > 0) {
        const res = await fetch(`${API_BASE}/api/customers/${customerId}/cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isbn, qty: nextQty }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data?.error || 'Failed to update qty');
      }

      const ctrl = new AbortController();
      await loadCart(ctrl.signal);
    } catch (e) {
      setError(e.message || 'Failed');
    } finally {
      setBusyIsbn('');
    }
  };

  const minusOne = async (isbn) => setExactQty(isbn, getQty(isbn) - 1);
  const removeItem = async (isbn) => setExactQty(isbn, 0);

  const clearCart = async () => {
    if (!customerId || isEmpty) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await Promise.all(
        items.map((it) =>
          fetch(`${API_BASE}/api/customers/${customerId}/cart/${it.isbn}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        )
      );
      const ctrl = new AbortController();
      await loadCart(ctrl.signal);
      setSuccess('Cart cleared');
    } catch (e) {
      setError(e.message || 'Failed to clear cart');
    } finally {
      setLoading(false);
    }
  };

  const checkout = async () => {
    if (!customerId) return;
    setError('');
    setSuccess('');

    if (isEmpty) return setError('Your cart is empty');

    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 12) return setError('Enter a valid card number');
    if (!/^\d{3,4}$/.test(cardCvv)) return setError('CVV must be 3 or 4 digits');
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return setError('Expiry must be MM/YY (example 05/27)');

    const payload = {
      payment_method: 'visa',
      card_last4: digits.slice(-4),
      card_expiry: cardExpiry,
      // Optional (backend can ignore):
      card_number: digits,
      cvv: cardCvv,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || 'Checkout failed');

      setSuccess('Order placed successfully ✅');

      setCardNumber('');
      setCardCvv('');
      setCardExpiry('');

      const ctrl = new AbortController();
      await loadCart(ctrl.signal);
    } catch (e) {
      setError(e.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bkPage ctPage">
      <div className="bkTopRow">
        <div className="ctTopActions">
          <button className="btn-primary" onClick={() => navigate('/c/books')}>
            Continue shopping
          </button>
          <button className="btn-danger" onClick={clearCart} disabled={loading || isEmpty}>
            <Trash2 size={16} /> Clear cart
          </button>
        </div>
      </div>

      <div className="bkGridHead">
        <div className="bkGridTitle">My Cart</div>
        <div className="bkGridHint">
          {loading ? 'Loading...' : error ? `Error: ${error}` : `${items.length} items`}
        </div>
      </div>

      {success ? <div className="ctAlert ctAlert--ok">{success}</div> : null}
      {error ? <div className="ctAlert ctAlert--err">{error}</div> : null}

      <div className="ctGrid">
        {/* LEFT */}
        <div className="ctPanel">
          <div className="ctPanelHead">
            <div className="ctPanelTitle">
              <ShoppingCart size={18} /> Items
            </div>
            <div className="ctBadge">{items.length}</div>
          </div>

          {isEmpty && !loading ? (
            <div className="ctEmpty">
              <div className="ctEmptyTitle">Your cart is empty</div>
              <div className="ctEmptySub">Browse books and add what you like.</div>
              <button className="btn-primary" onClick={() => navigate('/c/books')}>
                Browse books <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="ctList">
              {items.map((it) => {
                const busy = busyIsbn === it.isbn || loading;
                const price = parseFloat(it.selling_price ?? it.price ?? 0);
                const qty = parseInt(it.qty ?? 0, 10);
                const line = lineTotal(it);

                return (
                  <div className="ctItem" key={it.isbn}>
                    <div className="ctItemMain">
                      <div className="ctItemTitle">{it.title}</div>
                      <div className="ctItemMeta">
                        ISBN: {it.isbn} • Price: {formatMoney(price)}
                      </div>
                    </div>

                    <div className="ctQty">
                      <button className="ctQtyBtn" onClick={() => minusOne(it.isbn)} disabled={busy}>
                        <Minus size={16} />
                      </button>
                      <div className="ctQtyVal">{qty}</div>
                      <button className="ctQtyBtn" onClick={() => addOne(it.isbn)} disabled={busy}>
                        <Plus size={16} />
                      </button>
                    </div>

                    <div className="ctLineTotal">{formatMoney(line)}</div>

                    <button className="ctRemove" onClick={() => removeItem(it.isbn)} disabled={busy}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="ctPanel ctPanel--sticky ctPanel--tight">
          <div className="ctPanelHead">
            <div className="ctPanelTitle">Summary</div>
          </div>

          <div className="ctSummaryRow">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>

          <div className="ctHr" />

          <div className="ctField">
            <label>Card Number</label>
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
              placeholder="1234-5678-9012-3456"
              inputMode="numeric"
            />
          </div>

          <div className="ctField">
            <label>CVV</label>
            <input
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="667"
              inputMode="numeric"
            />
          </div>

          <div className="ctField">
            <label>Expiry (MM/YY)</label>
            <input
              value={cardExpiry}
              onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
              placeholder="05/27"
            />
          </div>

          <button className="btn-primary ctCheckoutBtn" onClick={checkout} disabled={loading || isEmpty}>
            Checkout <ArrowRight size={16} />
          </button>

          <div className="ctNote">Card info is validated before checkout.</div>
        </div>
      </div>
    </div>
  );
}
