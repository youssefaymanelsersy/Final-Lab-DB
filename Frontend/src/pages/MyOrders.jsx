import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Package, Calendar, CreditCard, X, Receipt, MapPin, User } from 'lucide-react';
import '../Styles/MyOrders.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function MyOrders() {
  const { user } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (user?.id) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
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
  };

const openReceipt = (order) => {
  setSelectedOrder(order);
  setOrderDetails(order.items || []);
  setLoadingDetails(false);

  console.log('ORDER ITEMS:', order.items);
};


  const closeReceipt = () => {
    setSelectedOrder(null);
    setOrderDetails(null);
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
          <p>Start shopping to see your orders here!</p>
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

                
                </>
              )}
            </div>

            <div className="receipt-footer">
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