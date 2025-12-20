import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';

import LoginPage from './pages/LoginPage.jsx';

// TODO: replace these with your real pages
import BooksPage from './pages/BooksPage.jsx';

function Placeholder({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p style={{ opacity: 0.7, marginTop: 8 }}>Coming soon…</p>
    </div>
  );
}

function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ✅ Auth page as default landing */}
      <Route path="/auth" element={<LoginPage />} />

      {/* ✅ Admin area (with Sidebar) */}
      <Route element={<AdminLayout />}>
        <Route path="/customers" element={<Placeholder title="Customers" />} />

        <Route path="/books" element={<BooksPage />} />

        <Route path="/orders" element={<Placeholder title="Orders" />} />
      </Route>

      {/* Default route goes to auth */}
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}
