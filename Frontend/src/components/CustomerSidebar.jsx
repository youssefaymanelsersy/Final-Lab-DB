import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ShoppingCart,
  Receipt,
  Settings,
  LogOut,
  Heart,
} from 'lucide-react';
import '../Styles/Sidebar.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';


export default function CustomerSidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);

  const resolvedAvatar = useMemo(() => {
    if (!avatarUrl) return null;
    return avatarUrl.startsWith('/') ? `${API_BASE}${avatarUrl}` : avatarUrl;
  }, [avatarUrl]);

  const initials = String(
    user?.first_name?.[0] || user?.username?.[0] || 'C'
  ).toUpperCase();

  useEffect(() => {
    // if parent updates user (e.g., after /auth/me), sync avatar
    if (user?.avatar_url) setAvatarUrl(user.avatar_url);
  }, [user?.avatar_url]);

  useEffect(() => {
    // If no avatar provided on session, fetch profile once
    let stop = false;
    async function fetchProfile() {
      if (!user?.id || avatarUrl) return;
      try {
        const res = await fetch(`${API_BASE}/api/customers/${user.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!stop && data?.ok && data.profile?.avatar_url) {
          setAvatarUrl(data.profile.avatar_url);
        }
      } catch (_) {
        // ignore; sidebar can fall back to initials
      }
    }
    fetchProfile();
    return () => {
      stop = true;
    };
  }, [user?.id, avatarUrl]);

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

        <NavLink to="/c/wishlist" className="sbItem">
          <Heart size={18} />
          Wishlist
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
          {resolvedAvatar ? (
            <img
              className="sbAvatar"
              src={resolvedAvatar}
              alt="avatar"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="sbAvatar">{initials}</div>
          )}
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
