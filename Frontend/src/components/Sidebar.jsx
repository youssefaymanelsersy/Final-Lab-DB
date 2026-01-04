import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import '../Styles/Sidebar.css';
import { Users, Library, ShoppingBag, BarChart3, LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/books', label: 'Books', icon: Library },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false); // Mobile state

  const toggleSidebar = () => setIsOpen(!isOpen);
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) setIsOpen(false);
  };

  const displayName = user?.first_name
    ? `${user.first_name} ${user?.last_name || ''}`.trim()
    : user?.username || 'Admin';

  const initials = String(user?.first_name?.[0] || user?.username?.[0] || 'A').toUpperCase();

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="mobile-toggle" onClick={toggleSidebar}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sbBrand">
          <div className="sbMark" />
          <div className="sbBrandText">
            <div className="sbName">Shop Admin</div>
            <div className="sbSub">Management</div>
          </div>
        </div>

        <nav className="sbNav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => 'sbItem ' + (isActive ? 'active' : '')}
              onClick={handleLinkClick}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sbBottom">
          <button className="sbGhost" type="button" onClick={onLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>

          <div className="sbMe">
            <div className="sbAvatar">{initials}</div>
            <div className="sbMeMeta">
              <div className="sbMeName">{displayName}</div>
              <div className="sbMeRole">{user?.role || 'Admin'}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}