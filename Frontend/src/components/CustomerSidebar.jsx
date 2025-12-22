import { NavLink } from 'react-router-dom';
import '../Styles/Sidebar.css';
import { Library, ShoppingCart, Receipt, Settings, LogOut } from 'lucide-react';

const navItems = [
  { to: '/c/books', label: 'Books', icon: Library },
  { to: '/c/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/c/orders', label: 'My Orders', icon: Receipt },
  { to: '/c/settings', label: 'Settings', icon: Settings },
];

export default function CustomerSidebar({ onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sbBrand">
        <div className="sbMark" />
        <div className="sbBrandText">
          <div className="sbName">BookStore</div>
          <div className="sbSub">Customer</div>
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
        {/* Use the prop passed from App.jsx */}
        <button className="sbGhost" type="button" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>

        <div className="sbMe">
          <div className="sbAvatar">CU</div>
          <div className="sbMeMeta">
            <div className="sbMeName">Customer</div>
            <div className="sbMeRole">Shopping</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
