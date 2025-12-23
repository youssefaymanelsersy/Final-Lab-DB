import CustomerSidebar from '../components/CustomerSidebar.jsx';
import { Outlet } from 'react-router-dom';

export default function CustomerLayout({ onLogout, user }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <CustomerSidebar onLogout={onLogout} user={user} />
      <main style={{ flex: 1 }}>
        <Outlet context={{ user }} /> 
      </main>
    </div>
  );
}
