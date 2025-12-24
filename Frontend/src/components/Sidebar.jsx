import { NavLink } from 'react-router-dom';
import '../Styles/Sidebar.css';
import { Users, Library, ShoppingBag, BarChart3, LogOut } from 'lucide-react';

const navItems = [
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/books', label: 'Books', icon: Library },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="sidebar">
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
            Icon={Icon}
            // 'end' ensures /admin/books doesn't stay active when at /admin/books/new
            end
            className={({ isActive }) => 'sbItem ' + (isActive ? 'active' : '')}
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
          <div className="sbAvatar">AS</div>
          <div className="sbMeMeta">
            <div className="sbMeName">Ahmed Sameh</div>
            <div className="sbMeRole">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
