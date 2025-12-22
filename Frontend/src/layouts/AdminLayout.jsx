import Sidebar from '../components/Sidebar.jsx';
import { Outlet } from 'react-router-dom';

export default function AdminLayout({ onLogout }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
