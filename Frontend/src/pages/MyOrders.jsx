import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Package, Calendar, CreditCard, X, Receipt, MapPin, User, RotateCcw } from 'lucide-react';
import { Download } from 'lucide-react';
import '../Styles/MyOrders.css';

const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  throw new Error("VITE_API_BASE is not defined");
}

export default function MyOrders() {
  const { user } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [reorderingId, setReorderingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/customers/${user.id}/orders`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) setOrders(data.orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchOrders();
  }, [user?.id, fetchOrders]);

  const openReceipt = (order) => {
    setSelectedOrder(order);
    setOrderDetails(order.items || []);
    setLoadingDetails(false);

    console.log('ORDER ITEMS:', order.items);
  };

  const downloadReceipt = async () => {
    if (!selectedOrder) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const safeText = (t) => String(t ?? '').toString();

    doc.setFontSize(18);
    doc.text('Order Receipt', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.text(`Order #${safeText(selectedOrder.id)}`, 20, y); y += 6;
    doc.text(`Date: ${new Date(selectedOrder.order_date).toLocaleDateString()}`, 20, y); y += 6;
    doc.text(`Customer: ${safeText(user?.name || user?.email || 'Customer')}`, 20, y); y += 12;

    doc.setFontSize(12);
    doc.text('Items', 20, y); y += 8;

    doc.setFontSize(9);
    doc.text('Book', 20, y);
    doc.text('Qty', 100, y);
    doc.text('Price', 130, y);
    doc.text('Total', 160, y);
    y += 4;
    doc.line(20, y, 190, y); y += 6;

    (orderDetails || []).forEach((item) => {
      const title = safeText(item.book_title).slice(0, 40);
      const qty = Number(item.qty || 0);
      const price = Number(item.unit_price || 0);
      const total = qty * price;
      doc.text(title, 20, y);
      doc.text(String(qty), 100, y);
      doc.text(`$${price.toFixed(2)}`, 130, y);
      doc.text(`$${total.toFixed(2)}`, 160, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });

    y += 6; doc.line(20, y, 190, y); y += 8;
    doc.setFontSize(11);
    const grand = Number(selectedOrder.total_price || 0);
    doc.text('Total:', 130, y);
    doc.text(`$${grand.toFixed(2)}`, 160, y);

    doc.save(`receipt-${safeText(selectedOrder.id)}.pdf`);
  };

  const closeReceipt = () => {
    setSelectedOrder(null);
    setOrderDetails(null);
  };

  const handleReorder = async (orderId) => {
    try {
      setReorderingId(orderId);
      const res = await fetch(`${API_BASE}/api/customers/${user.id}/orders/${orderId}/reorder`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        alert('✓ Items added to cart!');
        closeReceipt();
      } else {
        alert(`Error: ${data.error || 'Failed to reorder'}`);
      }
    } catch (error) {
      alert('Failed to reorder. Please try again.');
      console.error(error);
    } finally {
      setReorderingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatPrice = (price) => `$${Number(price).toFixed(2)}`;

  if (loading) {
    return (
      <div className="my-orders-page">
        <div className="loader"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="my-orders-page">
        <div className="empty-orders">
          <Package />
          <h2>No Orders Yet</h2>
          <p>Start shopping to see youconstr orders here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <div className="my-orders-container">
        <div className="orders-header">
          <h1>Order History</h1>
          <div className="orders-count">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </div>
        </div>

        {orders.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <div className="order-header-top">
                <div>
                  <div className="order-title">
                    <Package /> Order #{order.id}
                  </div>
                  <div className="order-meta">
                    <div>
                      <Calendar /> {formatDate(order.order_date)}
                    </div>
                    <div>
                      <CreditCard /> Card ending in {order.card_last4}
                    </div>
                  </div>
                </div>
                <div className="order-total">
                  <div className="amount">{formatPrice(order.total_price)}</div>
                  <div className="label">Total</div>
                </div>
              </div>

              <button
                onClick={() => openReceipt(order)}
                className="order-toggle"
              >
                <Receipt />
                View Receipt
              </button>

              <button
                onClick={() => handleReorder(order.id)}
                className="order-reorder"
                disabled={reorderingId === order.id}
                title="Quick reorder - adds all items to cart"
              >
                <RotateCcw size={18} />
                {reorderingId === order.id ? 'Reordering...' : 'Reorder'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Receipt Sidebar */}
      {selectedOrder && (
        <>
          <div className="receipt-overlay" onClick={closeReceipt}></div>
          <div className="receipt-sidebar">
            <div className="receipt-header">
              <div className="receipt-title">
                <Receipt />
                <span>Order Receipt</span>
              </div>
              <button onClick={closeReceipt} className="receipt-close">
                <X />
              </button>
            </div>

            <div className="receipt-content">
              {loadingDetails ? (
                <div className="receipt-loading">
                  <div className="loader-small"></div>
                  <p>Loading receipt...</p>
                </div>
              ) : (
                <>
                  {/* Order Info */}
                  <div className="receipt-section">
                    <div className="receipt-section-title">Order Information</div>
                    <div className="receipt-info-grid">
                      <div className="receipt-info-item">
                        <span className="info-label">Order Number</span>
                        <span className="info-value">#{selectedOrder.id}</span>
                      </div>
                      <div className="receipt-info-item">
                        <span className="info-label">Date</span>
                        <span className="info-value">{new Date(selectedOrder.order_date).toLocaleDateString()}</span>
                      </div>
                      <div className="receipt-info-item">
                        <span className="info-label">Time</span>
                        <span className="info-value">{new Date(selectedOrder.order_date).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>



                  {/* Items */}
                  <div className="receipt-section">
                    <div className="receipt-section-title">Order Items</div>
                    <div className="receipt-items">
                      {orderDetails?.map((item, idx) => (
                        <div key={idx} className="receipt-item">
                          <div className="receipt-item-main">
                            <div className="receipt-item-name">{item.book_title}</div>
                            <div className="receipt-item-meta">
                              ISBN: {item.isbn}
                            </div>
                            <div className="receipt-item-calc">
                              {formatPrice(item.unit_price)} × {item.qty}
                            </div>
                          </div>
                          <div className="receipt-item-total">
                            {formatPrice(item.unit_price * item.qty)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="receipt-section receipt-summary">
                    <div className="receipt-summary-row">
                      <span>Subtotal</span>
                      <span>{formatPrice(selectedOrder.total_price)}</span>
                    </div>
                    <div className="receipt-summary-row">
                      <span>Tax</span>
                      <span>$0.00</span>
                    </div>
                    <div className="receipt-summary-row">
                      <span>Shipping</span>
                      <span>Free</span>
                    </div>
                    <div className="receipt-total">
                      <span>Total</span>
                      <span>{formatPrice(selectedOrder.total_price)}</span>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="receipt-section">
                    <div className="receipt-section-title">
                      <CreditCard />
                      Payment Method
                    </div>
                    <div className="receipt-payment">
                      <div>Card ending in •••• {selectedOrder.card_last4}</div>
                      <div>Expires: {selectedOrder.card_expiry}</div>
                    </div>
                  </div>

                  {/* Reorder Button removed from receipt view per UX preference */}
                </>
              )}
            </div>

            <div className="receipt-footer">
              <button onClick={downloadReceipt} className="receipt-download-btn">
                <Download size={18} />
                Download PDF
              </button>
              <button onClick={closeReceipt} className="receipt-done-btn">
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}