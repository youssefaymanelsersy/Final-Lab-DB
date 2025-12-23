import React, { useState, useEffect } from 'react';
import {useOutletContext} from 'react-router-dom';
import { Package, Calendar, CreditCard, ChevronDown, ChevronUp, Eye } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function MyOrders() {
  const { user } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/customers/${user.id}/orders`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.ok) {
        setOrders(data.orders);
      }
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
        setOrderDetails(prev => ({
          ...prev,
          [orderId]: data.items
        }));
        setExpandedOrder(orderId);
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return `$${Number(price).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Orders Yet</h2>
            <p className="text-gray-500">Start shopping to see your orders here!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <div className="text-sm text-gray-600">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </div>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Order Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-lg">Order #{order.id}</span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.order_date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Card ending in {order.card_last4}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPrice(order.total_price)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Total</div>
                  </div>
                </div>

                <button
                  onClick={() => fetchOrderDetails(order.id)}
                  className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-2 text-gray-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {expandedOrder === order.id ? 'Hide Details' : 'View Details'}
                  {expandedOrder === order.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Order Details (Expanded) */}
              {expandedOrder === order.id && orderDetails[order.id] && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
                  
                  <div className="space-y-3">
                    {orderDetails[order.id].map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.book_title}</div>
                          <div className="text-sm text-gray-500">ISBN: {item.isbn}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatPrice(item.unit_price)} × {item.qty}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatPrice(item.unit_price * item.qty)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Qty: {item.qty}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Order Total</span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatPrice(order.total_price)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <div className="font-semibold mb-1">Payment Information</div>
                      <div>Card ending in {order.card_last4}</div>
                      <div>Expires: {order.card_expiry}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
