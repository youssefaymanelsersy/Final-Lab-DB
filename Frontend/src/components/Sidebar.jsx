import { NavLink } from 'react-router-dom';
import '../Styles/Sidebar.css';
import {
  LayoutGrid,
  Users,
  Library,
  ShoppingBag,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/books', label: 'Books', icon: Library },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
];

export default function Sidebar() {
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
            className={({ isActive }) => 'sbItem ' + (isActive ? 'active' : '')}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sbBottom">
        <button className="sbGhost" type="button">
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
