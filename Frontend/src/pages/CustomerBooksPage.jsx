import { useEffect, useMemo, useState, useCallback } from 'react';
import CategoryPicker from '../components/CategoryPicker.jsx';
import SearchOverlay from '../components/SearchOverlay.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import BookCard from '../components/BookCard.jsx';
import ReviewModal from '../components/ReviewModal.jsx';
import '../Styles/BooksPage.css';
import '../Styles/FilterPanel.css';
import {useOutletContext} from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// 1. Accept the 'user' prop from App.jsx
export default function CustomerBooksPage() {
  const { user } = useOutletContext();
  // 2. Get Customer ID directly from the user object (Safe & Reactive)
  const customerId = user?.id;

  const [cat, setCat] = useState('all');
  const [view, setView] = useState('grid');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);

  // Filter states
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(5000);

  // cart map: { [isbn]: qty }
  const [cartQty, setCartQty] = useState({});
  
  // wishlist set: { isbn: true }
  const [wishlistSet, setWishlistSet] = useState({});
  
  // review modal
  const [reviewingBook, setReviewingBook] = useState(null);

  const categories = useMemo(
    () => [
      { id: 'all', label: 'All Genre' },
      { id: 'Science', label: 'Science' },
      { id: 'Art', label: 'Art' },
      { id: 'Religion', label: 'Religion' },
      { id: 'History', label: 'History' },
      { id: 'Geography', label: 'Geography' },
    ],
    []
  );

  const sortOptions = useMemo(() => ([
    { value: 'newest', label: 'Newest' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'price', label: 'Price Low-High' },
    { value: 'price_desc', label: 'Price High-Low' },
    { value: 'year', label: 'Publication Year' },
    { value: 'stock_low', label: 'Lowest Stock' },
  ]), []);

  const loadBooks = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const body = { 
        limit: 50,
        price_min: priceMin,
        price_max: priceMax,
        sort_by: sortBy,
      };
      if (cat !== 'all') body.category = cat;
      if (search.trim()) body.q_title = search.trim();

      const res = await fetch(`${API_BASE}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load');

      setBooks(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [cat, priceMin, priceMax, sortBy, search]);

  const loadCart = useCallback(async () => {
    // 3. Safety check using the prop
    if (!customerId) return;

    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/cart`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        const map = {};
        data.items.forEach((it) => {
          map[it.isbn] = Number(it.qty);
        });
        setCartQty(map);
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
    }
  }, [customerId]);

  const loadWishlist = useCallback(async () => {
    if (!customerId) return;

    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/wishlist`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        const set = {};
        data.items.forEach((it) => {
          set[it.isbn] = true;
        });
        setWishlistSet(set);
      }
    } catch (e) {
      console.error('Failed to load wishlist:', e);
    }
  }, [customerId]);

  const toggleWishlist = useCallback(async (isbn) => {
    if (!customerId) return alert('Please log in first');

    const isInWishlist = wishlistSet[isbn];
    
    // Optimistic update
    setWishlistSet((prev) => {
      const next = { ...prev };
      if (isInWishlist) delete next[isbn];
      else next[isbn] = true;
      return next;
    });

    try {
      if (isInWishlist) {
        await fetch(`${API_BASE}/api/customers/${customerId}/wishlist/${isbn}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } else {
        await fetch(`${API_BASE}/api/customers/${customerId}/wishlist/${isbn}`, {
          method: 'POST',
          credentials: 'include',
        });
      }
    } catch (e) {
      console.error('Wishlist toggle failed:', e);
      // Revert on error
      setWishlistSet((prev) => {
        const next = { ...prev };
        if (isInWishlist) next[isbn] = true;
        else delete next[isbn];
        return next;
      });
    }
  }, [customerId, wishlistSet]);

  const addOne = useCallback(async (isbn) => {
    if (!customerId) return alert('Please log in first');

    setCartQty((prev) => ({ ...prev, [isbn]: (prev[isbn] || 0) + 1 }));

    try {
      await fetch(`${API_BASE}/api/customers/${customerId}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isbn, qty: 1 }),
      });
    } catch (e) {
      console.error('Add failed:', e);
    }
  }, [customerId]);

  const setQty = useCallback(async (isbn, qty) => {
    if (!customerId) return;

    setCartQty((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[isbn];
      else next[isbn] = qty;
      return next;
    });

    try {
      await fetch(`${API_BASE}/api/customers/${customerId}/cart/${isbn}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ qty }),
      });
    } catch (e) {
      console.error('Update failed:', e);
    }
  }, [customerId]);

  useEffect(() => {
    const controller = new AbortController();
    loadBooks(controller.signal);
    return () => controller.abort();
  }, [loadBooks]);

  // 4. Update dependency: Re-load cart if customerId changes (e.g. login)
  useEffect(() => {
    if (customerId) {
      loadCart();
      loadWishlist();
    }
  }, [customerId, loadCart, loadWishlist]);

  const handlePick = (value) => {
    const picked = String(value || '').trim();
    const matchCat = categories.find(
      (c) => c.label.toLowerCase() === picked.toLowerCase()
    );
    if (matchCat) setCat(matchCat.id);
  };

  const handleFilterReset = () => {
    setPriceMin(0);
    setPriceMax(5000);
    setSortBy('newest');
    setCat('all');
    setSearch('');
  };

  return (
    <div className="bkPage">
      <div className="bkTopRow">
        <SearchOverlay
          placeholder="Pick a category"
          shortcutHint="⌘K"
          trendingItems={categories
            .filter((c) => c.id !== 'all')
            .map((c) => c.label)}
          newInItems={['Books', 'Cart', 'My Orders', 'Settings']}
          onPick={handlePick}
        />
        <div style={{ marginLeft: 'auto' }}>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <div className="bkCatsRow">
        <CategoryPicker
          value={cat}
          onChange={setCat}
          items={categories}
          title="Featured Categories"
          rightLabel="All Genre"
          onRightClick={() => setCat('all')}
        />
      </div>

      {/* Compact Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <label className="filter-label">Search</label>
          <input
            type="text"
            className="bkFilterInput"
            placeholder="Search by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group" style={{ minWidth: '220px' }}>
          <label className="filter-label">Sort By</label>
          <div className="bkFilterSelect" onBlur={() => setSortOpen(false)} tabIndex={0}>
            <button
              type="button"
              className="bkFilterSelectBtn"
              onClick={() => setSortOpen((o) => !o)}
            >
              {sortOptions.find((o) => o.value === sortBy)?.label || 'Sort'}
              <span className={`caret ${sortOpen ? 'open' : ''}`}>▾</span>
            </button>
            {sortOpen && (
              <div className="bkFilterSelectList">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`bkFilterSelectItem ${sortBy === opt.value ? 'active' : ''}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSortBy(opt.value);
                      setSortOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="price-range">
          <div className="filter-group">
            <label className="filter-label">Min Price</label>
            <input
              type="number"
              min="0"
              value={priceMin}
              onChange={(e) => setPriceMin(Number(e.target.value))}
              className="filter-input"
              placeholder="0"
            />
          </div>
          <div className="price-divider">—</div>
          <div className="filter-group">
            <label className="filter-label">Max Price</label>
            <input
              type="number"
              min="0"
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              className="filter-input"
              placeholder="5000"
            />
          </div>
        </div>

        <button onClick={handleFilterReset} className="filter-reset-btn">
          Reset Filters
        </button>
      </div>

      <div className="bkGridHead">
        <div className="bkGridTitle">Browse books</div>
        <div className="bkGridHint">
          {loading
            ? 'Loading...'
            : error
            ? `Error: ${error}`
            : `${books.length} items`}
        </div>
      </div>

      <div className={`bkGrid ${view === 'list' ? 'bkList' : ''}`}>
        {books.map((b) => (
          <BookCard
            key={b.isbn}
            book={b}
            qtyInCart={cartQty[b.isbn] || 0}
            onAddOne={() => addOne(b.isbn)}
            onSetQty={(qty) => setQty(b.isbn, qty)}
            isInWishlist={wishlistSet[b.isbn] || false}
            onToggleWishlist={() => toggleWishlist(b.isbn)}
            onReview={() => setReviewingBook(b)}
            viewMode={view}
          />
        ))}
      </div>

      {reviewingBook && (
        <ReviewModal
          book={reviewingBook}
          user={user}
          onClose={() => setReviewingBook(null)}
          onSubmitted={() => {
            // Refresh books to update ratings
            loadBooks();
          }}
        />
      )}
    </div>
  );
}
