import Sidebar from '../components/Sidebar.jsx';
import { Outlet } from 'react-router-dom';

export default function AdminLayout({ user, onLogout }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} onLogout={onLogout} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
