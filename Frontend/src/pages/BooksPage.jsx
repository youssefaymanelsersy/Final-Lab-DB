import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Save } from 'lucide-react'; // Import icons for Modal

// Import Shared Component
import BookCard from '../components/BookCard.jsx';
import CategoryPicker from '../components/CategoryPicker.jsx';
import SearchOverlay from '../components/SearchOverlay.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import '../Styles/BooksPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function BooksPage() {
  const navigate = useNavigate();
  const [cat, setCat] = useState('all');
  const [view, setView] = useState('grid');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // EDIT STATE
  const [editingBook, setEditingBook] = useState(null);

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

  // --- DATA FETCHING ---
  const loadBooks = async (signal) => {
    setLoading(true);
    setError('');
    try {
      const url = new URL(`${API_BASE}/api/books`);
      if (cat !== 'all') url.searchParams.set('category', cat);
      url.searchParams.set('limit', '50');

      const res = await fetch(url.toString(), { signal });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || 'Unknown backend error');
      setBooks(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadBooks(controller.signal);
    return () => controller.abort();
  }, [cat]);

  // --- HANDLERS ---
  const handlePick = (value) => {
    const picked = String(value || '').trim();
    const matchCat = categories.find(
      (c) => c.label.toLowerCase() === picked.toLowerCase()
    );
    if (matchCat) {
      setCat(matchCat.id);
      return;
    }
    const key = picked.toLowerCase();
    if (key === 'books') navigate('/admin/books');
    if (key === 'customers') navigate('/admin/customers');
    if (key === 'orders') navigate('/admin/orders');
  };

  const handleUpdateBook = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/books/${editingBook.isbn}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(editingBook),
        }
      );
      const data = await res.json();

      if (data.ok) {
        setEditingBook(null); // Close modal
        loadBooks(); // Refresh list to show changes
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to update book');
    }
  };

  return (
    <div className="bkPage">
      <div className="bkTopRow">
        <SearchOverlay
          placeholder="Admin Search..."
          shortcutHint="⌘K"
          trendingItems={categories
            .filter((c) => c.id !== 'all')
            .map((c) => c.label)}
          newInItems={['Books', 'Customers', 'Orders']}
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
        <div className="bkGridTitle">Browse books (Admin)</div>
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
            onEdit={setEditingBook} // Pass the setter to the card
          />
        ))}
      </div>

      {/* --- EDIT MODAL --- */}
      {editingBook && (
        <div className="modal-overlay" onClick={() => setEditingBook(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Book</h2>
              <button
                className="close-btn"
                onClick={() => setEditingBook(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateBook}>
              <div className="modal-body">
                {/* Read Only ISBN */}
                <div className="form-group">
                  <label>ISBN (Cannot Change)</label>
                  <input
                    type="text"
                    value={editingBook.isbn}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editingBook.title}
                    onChange={(e) =>
                      setEditingBook({ ...editingBook, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input
                      type="number"
                      value={editingBook.stock_qty}
                      onChange={(e) =>
                        setEditingBook({
                          ...editingBook,
                          stock_qty: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Threshold</label>
                    <input
                      type="number"
                      value={editingBook.threshold}
                      onChange={(e) =>
                        setEditingBook({
                          ...editingBook,
                          threshold: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingBook.selling_price}
                      onChange={(e) =>
                        setEditingBook({
                          ...editingBook,
                          selling_price: parseFloat(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input
                      type="number"
                      value={editingBook.publication_year}
                      onChange={(e) =>
                        setEditingBook({
                          ...editingBook,
                          publication_year: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingBook(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
