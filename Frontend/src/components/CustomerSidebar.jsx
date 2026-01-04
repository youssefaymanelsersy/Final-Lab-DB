import { NavLink, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { BookOpen, ShoppingCart, Receipt, Settings, LogOut, Heart, Menu, X } from 'lucide-react';
import '../Styles/Sidebar.css';

export default function CustomerSidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // Mobile toggle state

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Close sidebar when a link is clicked (on mobile)
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) setIsOpen(false);
  };

  const resolvedAvatar = useMemo(() => {
    const avatarUrl = user?.avatar_url || null;
    if (!avatarUrl) return null;
    return avatarUrl.startsWith('/') ? `${avatarUrl}` : avatarUrl;
  }, [user?.avatar_url]);

  const initials = String(user?.first_name?.[0] || user?.username?.[0] || 'C').toUpperCase();

  async function handleLogoutClick() {
    if (onLogout) await onLogout();
    navigate('/auth', { replace: true });
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="mobile-toggle" onClick={toggleSidebar}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay to close sidebar when clicking outside */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sbBrand">
          <div className="sbMark" />
          <div>
            <div className="sbName">BookStore</div>
            <div className="sbSub">Customer Portal</div>
          </div>
        </div>

        <nav className="sbNav">
          <NavLink to="/c/books" className="sbItem" onClick={handleLinkClick}>
            <BookOpen size={18} /> Books
          </NavLink>
          <NavLink to="/c/cart" className="sbItem" onClick={handleLinkClick}>
            <ShoppingCart size={18} /> Cart
          </NavLink>
          <NavLink to="/c/wishlist" className="sbItem" onClick={handleLinkClick}>
            <Heart size={18} /> Wishlist
          </NavLink>
          <NavLink to="/c/orders" className="sbItem" onClick={handleLinkClick}>
            <Receipt size={18} /> My Orders
          </NavLink>
          <NavLink to="/c/settings" className="sbItem" onClick={handleLinkClick}>
            <Settings size={18} /> Settings
          </NavLink>
        </nav>

        <div className="sbBottom">
          <div className="sbMe">
            {resolvedAvatar ? (
              <img className="sbAvatar" src={resolvedAvatar} alt="avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="sbAvatar">{initials}</div>
            )}
            <div>
              <div className="sbMeName">
                {user?.first_name ? `${user.first_name} ${user?.last_name || ''}`.trim() : user?.username || 'Customer'}
              </div>
              <div className="sbMeRole">customer</div>
            </div>
          </div>
          <button className="sbGhost" type="button" onClick={handleLogoutClick}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}