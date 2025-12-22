import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  Package,
  Plus,
  X,
} from 'lucide-react';
import '../Styles/OrdersPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function OrdersPage() {
  // --- STATE MANAGEMENT ---
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refresh, setRefresh] = useState(0); // Trigger to reload data

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ isbn: '', qty: 10 });

  // --- EFFECTS ---
  useEffect(() => {
    fetchOrders();
  }, [page, search, activeTab, refresh]);

  // --- API FUNCTIONS ---
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page,
        limit: 10,
        status: activeTab,
        search: search,
      });

      const res = await fetch(
        `${API_BASE}/api/admin/publisher-orders?${query}`,
        { credentials: 'include' }
      );
      const data = await res.json();

      if (data.ok) {
        setOrders(data.data);
        setTotalPages(data.meta.pages);
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id) => {
    if (
      !confirm(
        'Confirm receipt of this stock? This will update the book inventory.'
      )
    )
      return;

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/publisher-orders/${id}/confirm`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      const data = await res.json();
      if (data.ok) {
        setRefresh((p) => p + 1); // Reload table to show updated status
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to confirm order');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault(); // Stop page reload
    try {
      // API call happens only here, AFTER you fill the form and submit
      const res = await fetch(`${API_BASE}/api/admin/publisher-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newOrder),
      });
      const data = await res.json();

      if (data.ok) {
        setIsModalOpen(false); // Close the form
        setNewOrder({ isbn: '', qty: 10 }); // Reset form fields
        setRefresh((p) => p + 1); // Refresh the list
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to create order');
    }
  };

  // --- RENDER ---
  return (
    <div className="orders-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Replenishment Orders</h1>
          <div className="breadcrumbs">
            Dashboard / <span>Publisher Orders</span>
          </div>
        </div>
        <div className="header-actions">
          {/* Soft Refresh Button */}
          <button
            className="btn btn-soft"
            onClick={() => setRefresh((p) => p + 1)}
          >
            <RefreshCw size={16} /> Refresh
          </button>

          {/* Add Order Button: Just opens the modal */}
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} /> Add Order
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <Package size={20} />
          </div>
          <div>
            <h3>Total Orders</h3>
            <p className="stat-value">{orders.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper amber">
            <Clock size={20} />
          </div>
          <div>
            <h3>Pending</h3>
            <p className="stat-value">
              {orders.filter((o) => o.status === 'Pending').length}
            </p>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-tabs">
            {['All', 'Pending', 'Confirmed'].map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="search-filter-area">
            <div className="search-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search book or publisher..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <button className="filter-btn">
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : (
          <table className="order-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date Created</th>
                <th>Book</th>
                <th>Publisher</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="cell-id">#{order.id}</td>
                    <td className="cell-date">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="book-cell">
                        <img
                          src={
                            order.cover_url || 'https://via.placeholder.com/40'
                          }
                          alt="cover"
                          className="book-cover-mini"
                        />
                        <div className="book-info">
                          <span className="book-title" title={order.book_title}>
                            {order.book_title}
                          </span>
                          <span className="book-isbn">{order.isbn}</span>
                        </div>
                      </div>
                    </td>
                    <td>{order.publisher_name}</td>
                    <td className="cell-qty">{order.order_qty}</td>
                    <td>
                      <span
                        className={`status-badge ${order.status.toLowerCase()}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.status === 'Pending' && (
                        <button
                          className="btn-confirm"
                          onClick={() => handleConfirm(order.id)}
                          title="Confirm Receipt"
                        >
                          <CheckCircle size={16} /> Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="page-numbers">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <button className="active">{page}</button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* --- ADD ORDER MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          {/* stopPropagation prevents closing when clicking inside the box */}
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Replenishment</h2>
              <button
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="isbn">Book ISBN</label>
                  <input
                    id="isbn"
                    type="text"
                    placeholder="Enter 13-digit ISBN"
                    value={newOrder.isbn}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, isbn: e.target.value })
                    }
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="qty">Quantity to Order</label>
                  <input
                    id="qty"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={newOrder.qty}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, qty: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
