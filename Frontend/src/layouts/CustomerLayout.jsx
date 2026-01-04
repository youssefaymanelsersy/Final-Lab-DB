import CustomerSidebar from '../components/CustomerSidebar.jsx'; 
import { Outlet } from 'react-router-dom';

export default function CustomerLayout({ user, onLogout }) {
  return (
    <div className="layout-container">
      <CustomerSidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Outlet context={{ user }} /> 
      </main>
    </div>
  );
}