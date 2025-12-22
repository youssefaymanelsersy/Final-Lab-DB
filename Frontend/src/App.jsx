import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import OrdersPage from './pages/OrdersPage.jsx';
// Layouts
import AdminLayout from './layouts/AdminLayout.jsx';
import CustomerLayout from './layouts/CustomerLayout.jsx';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import BooksPage from './pages/BooksPage.jsx'; // Admin Books
import CustomerBooksPage from './pages/CustomerBooksPage.jsx'; // Customer Books
import ReportsPage from './pages/ReportsPage.jsx';

// Components
function Placeholder({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>{title}</h2>
      <p>Coming soon...</p>
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Check Session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) setUser(data.user);
        else setUser(null);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // 2. Global Logout Handler
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error(e);
    }
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      {/* --------------------- */}
      {/* AUTH ROUTES */}
      {/* --------------------- */}
      <Route
        path="/auth"
        element={
          !user ? (
            <LoginPage onLogin={(u) => setUser(u)} />
          ) : (
            // Redirect logged-in users to their correct home
            <Navigate
              to={user.role === 'admin' ? '/admin/books' : '/c/books'}
              replace
            />
          )
        }
      />

      {/* --------------------- */}
      {/* ADMIN ROUTES (/admin) */}
      {/* --------------------- */}
      <Route
        path="/admin"
        element={
          user && user.role === 'admin' ? (
            <AdminLayout onLogout={handleLogout} />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      >
        <Route index element={<Navigate to="books" replace />} />
        <Route path="books" element={<BooksPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route
          path="customers"
          element={<Placeholder title="Customers Management" />}
        />
        <Route path="orders" element={<Placeholder title="Admin Orders" />} />
      </Route>

      {/* --------------------- */}
      {/* CUSTOMER ROUTES (/c)  */}
      {/* --------------------- */}
      <Route
        path="/c"
        element={
          user && user.role === 'customer' ? (
            <CustomerLayout onLogout={handleLogout} />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      >
        <Route index element={<Navigate to="books" replace />} />
        <Route path="books" element={<CustomerBooksPage user={user} />} />
        <Route path="cart" element={<Placeholder title="My Cart" />} />
        <Route path="orders" element={<Placeholder title="My Orders" />} />
        <Route path="settings" element={<Placeholder title="Settings" />} />
      </Route>

      {/* --------------------- */}
      {/* FALLBACK */}
      {/* --------------------- */}
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}
