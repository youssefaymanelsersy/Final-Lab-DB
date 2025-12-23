import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Package, Calendar, CreditCard, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import '../Styles/MyOrders.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function MyOrders() {
  const { user } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});

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

  const fetchOrderDetails = async (orderId) => {
    if (orderDetails[orderId]) {
      setExpandedOrder(expandedOrder === orderId ? null : orderId);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/customers/${user.id}/orders/${orderId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setOrderDetails(prev => ({ ...prev, [orderId]: data.items }));
        setExpandedOrder(orderId);
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
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
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
            {/* Order Header */}
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
                onClick={() => fetchOrderDetails(order.id)}
                className="order-toggle"
              >
                <Eye />
                {expandedOrder === order.id ? 'Hide Details' : 'View Details'}
                {expandedOrder === order.id ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>

            {/* Order Details */}
            {expandedOrder === order.id && orderDetails[order.id] && (
              <div className="order-details">
                <h3>Order Items</h3>
                {orderDetails[order.id].map((item, idx) => (
                  <div key={idx} className="order-item">
                    <div>
                      <div className="order-item-title">{item.book_title}</div>
                      <div className="order-item-sub">ISBN: {item.isbn}</div>
                      <div className="order-item-sub">{formatPrice(item.unit_price)} × {item.qty}</div>
                    </div>
                    <div className="order-item-price">
                      <div className="total">{formatPrice(item.unit_price * item.qty)}</div>
                      <div className="qty">Qty: {item.qty}</div>
                    </div>
                  </div>
                ))}

                <div className="order-summary">
                  <span>Order Total</span>
                  <span>{formatPrice(order.total_price)}</span>
                </div>

                <div className="payment-box">
                  <strong>Payment Information</strong>
                  <div>Card ending in {order.card_last4}</div>
                  <div>Expires: {order.card_expiry}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
