import { NavLink } from 'react-router-dom';
import '../Styles/Sidebar.css';
import { Library, ShoppingCart, Receipt, LogOut, User } from 'lucide-react';

const navItems = [
  { to: '/c/books', label: 'Books', icon: Library },
  { to: '/c/cart', label: 'Cart', icon: ShoppingCart },
   { to: '/c/orders', label: 'My Orders', icon: Receipt },
   { to: '/c/profile', label: 'profile', icon: User },
];

export default function CustomerSidebar({ onLogout ,user})  {
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
     
        <button className="sbGhost" type="button" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>

        <NavLink to="/c/profile" className="sbMe">
          <div className="sbAvatar">CU</div>
          <div className="sbMeMeta">
            <div className="sbMeName">Customer</div>
            <div className="sbMeRole">Shopping</div>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
