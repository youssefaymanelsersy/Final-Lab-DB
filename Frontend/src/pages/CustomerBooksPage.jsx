import { useEffect, useMemo, useState } from 'react';
import CategoryPicker from '../components/CategoryPicker.jsx';
import SearchOverlay from '../components/SearchOverlay.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import BookCard from '../components/BookCard.jsx';
import '../Styles/BooksPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// 1. Accept the 'user' prop from App.jsx
export default function CustomerBooksPage({ user }) {
  // 2. Get Customer ID directly from the user object (Safe & Reactive)
  const customerId = user?.id;

  const [cat, setCat] = useState('all');
  const [view, setView] = useState('grid');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // cart map: { [isbn]: qty }
  const [cartQty, setCartQty] = useState({});

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

  async function loadBooks(signal) {
    setLoading(true);
    setError('');
    try {
      const url = new URL(`${API_BASE}/api/books`);
      if (cat !== 'all') url.searchParams.set('category', cat);
      url.searchParams.set('limit', '50');

      const res = await fetch(url.toString(), { signal });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load');

      setBooks(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadCart() {
    // 3. Safety check using the prop
    if (!customerId) return;

    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/cart`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        const map = {};
        data.items.forEach((it) => {
          map[it.isbn] = Number(it.qty);
        });
        setCartQty(map);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function addOne(isbn) {
    if (!customerId) return alert('Please log in first');

    setCartQty((prev) => ({ ...prev, [isbn]: (prev[isbn] || 0) + 1 }));

    try {
      await fetch(`${API_BASE}/api/customers/${customerId}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn, qty: 1 }),
      });
    } catch (e) {
      console.error('Add failed', e);
    }
  }

  async function setQty(isbn, qty) {
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
        body: JSON.stringify({ qty }),
      });
    } catch (e) {
      console.error('Update failed', e);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadBooks(controller.signal);
    return () => controller.abort();
  }, [cat]);

  // 4. Update dependency: Re-load cart if customerId changes (e.g. login)
  useEffect(() => {
    if (customerId) loadCart();
  }, [customerId]);

  const handlePick = (value) => {
    const picked = String(value || '').trim();
    const matchCat = categories.find(
      (c) => c.label.toLowerCase() === picked.toLowerCase()
    );
    if (matchCat) setCat(matchCat.id);
  };

  return (
    <div className="bkPage">
      <div className="bkTopRow">
        <SearchOverlay
          placeholder="Search or pick a category"
          shortcutHint="⌘K"
          trendingItems={categories
            .filter((c) => c.id !== 'all')
            .map((c) => c.label)}
          newInItems={['Books', 'Cart', 'My Orders', 'Settings']}
          onPick={handlePick}
        />
        <ViewToggle value={view} onChange={setView} />
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

      <div className="bkGrid">
        {books.map((b) => (
          <BookCard
            key={b.isbn}
            book={b}
            qtyInCart={cartQty[b.isbn] || 0}
            onAddOne={() => addOne(b.isbn)}
            onSetQty={(qty) => setQty(b.isbn, qty)}
          />
        ))}
      </div>
    </div>
  );
}
