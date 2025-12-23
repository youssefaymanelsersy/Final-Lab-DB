import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/SearchOverlay.css';
import { Search, X, Sparkles, ArrowRight, MapPin, Gift, ShoppingCart, Package, User, BookOpen } from 'lucide-react';

export default function SearchOverlay({
  trendingItems,
  newInItems,
  quickActions,
  shortcutHint = '⌘K',
  placeholder = 'What are you looking for?',
  onPick,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const trending = useMemo(
    () =>
      trendingItems ?? ['Science', 'History', 'Religion', 'Geography', 'Art'],
    [trendingItems]
  );

  const newIn = useMemo(
    () => newInItems ?? ['Books', 'Cart', 'My Orders', 'Profile'],
    [newInItems]
  );

  const quick = useMemo(
    () =>
      quickActions ?? [
        { icon: BookOpen, label: 'Browse Books', path: '/c/books' },
        { icon: ShoppingCart, label: 'My Cart', path: '/c/cart' },
        { icon: Package, label: 'My Orders', path: '/c/orders' },
        { icon: User, label: 'My Profile', path: '/c/profile' },
      ],
    [quickActions]
  );

  const close = () => {
    setOpen(false);
    setSelectedIndex(-1);
  };

  const openAndFocus = () => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Global shortcuts + escape + click outside
  useEffect(() => {
    const onKeyDown = (e) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openAndFocus();
        return;
      }
      // "/" opens like many dashboards (only if not typing)
      if (!open && e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          openAndFocus();
        }
        return;
      }
      if (open && e.key === 'Escape') close();

      // Arrow key navigation when panel is open
      if (open) {
        const allItems = [...filteredTrending, ...filteredNewIn, ...quick.map(q => q.label)];
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % allItems.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => prev <= 0 ? allItems.length - 1 : prev - 1);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          handleSelect(allItems[selectedIndex]);
        }
      }
    };

    const onMouseDown = (e) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) close();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) {
      setQ('');
      setSelectedIndex(-1);
    }
  }, [open]);

  const filteredTrending = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return trending;
    return trending.filter((t) => t.toLowerCase().includes(s));
  }, [q, trending]);

  const filteredNewIn = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return newIn;
    return newIn.filter((t) => t.toLowerCase().includes(s));
  }, [q, newIn]);

  const handleSelect = (value) => {
    // Check if it's a quick action with a path
    const quickAction = quick.find(qa => qa.label === value);
    
    if (quickAction?.path) {
      navigate(quickAction.path);
      close();
      return;
    }

    // Handle category/navigation items
    const routeMap = {
      // Categories
      'Science': '/c/books?category=Science',
      'Art': '/c/books?category=Art',
      'Religion': '/c/books?category=Religion',
      'History': '/c/books?category=History',
      'Geography': '/c/books?category=Geography',
      
      // Navigation
      'Books': '/c/books',
      'Cart': '/c/cart',
      'My Cart': '/c/cart',
      'My Orders': '/c/orders',
      'Orders': '/c/orders',
      'Profile': '/c/profile',
      'My Profile': '/c/profile',
      'Settings': '/c/profile',
    };

    if (routeMap[value]) {
      navigate(routeMap[value]);
      close();
      return;
    }

    // Fallback to onPick callback
    onPick?.(value);
    close();
  };

  const pick = (value) => {
    handleSelect(value);
  };

  return (
    <div className="searchWrap">
     
      <div className="searchTop">
        {/* <div className="searchChip" title="Search">
          <Search size={18} />
        </div> */}

        <button className="searchBar" type="button" onClick={openAndFocus}>
          <span className="searchPlaceholder">{placeholder}</span>
          <span className="searchHint">{shortcutHint}</span>
        </button>
      </div>

      {/* Backdrop */}
      {open && <div className="searchBackdrop" />}

      {/* Panel */}
      <div
        ref={panelRef}
        className={'searchPanel ' + (open ? 'open' : '')}
        aria-hidden={!open}
      >
        <div className="searchPanelHead">
          <div className="searchInputWrap">
            <Search size={18} className="searchInputIcon" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="searchInput"
              onFocus={() => setOpen(true)}
            />
            {q && (
              <button
                className="searchClear"
                type="button"
                onClick={() => setQ('')}
                title="Clear"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button className="searchCancel" type="button" onClick={close}>
            Cancel
          </button>
        </div>

        <div className="searchGrid">
          <div className="searchCol">
            <div className="searchTitle">Trending searches</div>
            <div className="searchList">
              {filteredTrending.map((t, idx) => (
                <button
                  key={t}
                  className={`searchItem ${selectedIndex === idx ? 'selected' : ''}`}
                  type="button"
                  onClick={() => pick(t)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="dot" />
                  <span className="label">{t}</span>
                  <ArrowRight size={16} className="arrow" />
                </button>
              ))}
              {!filteredTrending.length && (
                <div className="searchEmpty">No matches</div>
              )}
            </div>
          </div>

          {/* <div className="searchCol">
            <div className="searchTitle">New in</div>
            <div className="searchList">
              {filteredNewIn.map((t, idx) => {
                const globalIdx = filteredTrending.length + idx;
                return (
                  <button
                    key={t}
                    className={`searchItem compact ${selectedIndex === globalIdx ? 'selected' : ''}`}
                    type="button"
                    onClick={() => pick(t)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <span className="label">{t}</span>
                    <ArrowRight size={16} className="arrow" />
                  </button>
                );
              })}
              {!filteredNewIn.length && (
                <div className="searchEmpty">No matches</div>
              )}
            </div>
          </div> */}

          <div className="searchCol">
            <div className="searchTitle">Quick actions</div>
            <div className="searchCards">
              {quick.map(({ icon: Icon, label, path }, idx) => {
                const globalIdx = filteredTrending.length + filteredNewIn.length + idx;
                return (
                  <button
                    key={label}
                    className={`searchCard ${selectedIndex === globalIdx ? 'selected' : ''}`}
                    type="button"
                    onClick={() => pick(label)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <div className="searchCardIcon">
                      <Icon size={18} />
                    </div>
                    <div className="searchCardText">
                      <div className="searchCardLabel">{label}</div>
                      <div className="searchCardSub">Open</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="searchFooter">
          <span>Tip:</span> Press <kbd>↑</kbd> <kbd>↓</kbd> to navigate • Press <kbd>Enter</kbd> to select • Press <kbd>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}