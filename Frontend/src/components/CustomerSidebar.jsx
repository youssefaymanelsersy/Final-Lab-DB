import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ShoppingCart,
  Receipt,
  Settings,
  LogOut,
} from 'lucide-react';
import '../Styles/Sidebar.css';

export default function CustomerSidebar({ user, onLogout }) {
  const navigate = useNavigate();

  const initials = String(
    user?.first_name?.[0] || user?.username?.[0] || 'C'
  ).toUpperCase();

  async function handleLogoutClick() {
    if (onLogout) await onLogout();
    navigate('/auth', { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="sbBrand">
        <div className="sbMark" />
        <div>
          <div className="sbName">BookStore</div>
          <div className="sbSub">Customer Portal</div>
        </div>
      </div>

      <nav className="sbNav">
        <NavLink to="/c/books" className="sbItem">
          <BookOpen size={18} />
          Books
        </NavLink>

        <NavLink to="/c/cart" className="sbItem">
          <ShoppingCart size={18} />
          Cart
        </NavLink>

        <NavLink to="/c/orders" className="sbItem">
          <Receipt size={18} />
          My Orders
        </NavLink>

        <NavLink to="/c/settings" className="sbItem">
          <Settings size={18} />
          Settings
        </NavLink>
      </nav>

      <div className="sbBottom">
        <div className="sbMe">
          <div className="sbAvatar">{initials}</div>
          <div>
            <div className="sbMeName">
              {user?.first_name
                ? `${user.first_name} ${user?.last_name || ''}`.trim()
                : user?.username || 'Customer'}
            </div>
            <div className="sbMeRole">customer</div>
          </div>
        </div>

        <button className="sbGhost" type="button" onClick={handleLogoutClick}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
