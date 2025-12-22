import CustomerSidebar from '../components/CustomerSidebar.jsx';
import { Outlet } from 'react-router-dom';

export default function CustomerLayout({ onLogout }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <CustomerSidebar onLogout={onLogout} />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
