import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CategoryPicker from '../components/CategoryPicker.jsx';
import SearchOverlay from '../components/SearchOverlay.jsx';
import ViewToggle from '../components/ViewToggle.jsx';

import '../Styles/BooksPage.css';

function Stars({ value = 4.5 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return '★';
    if (i === full && half) return '☆';
    return '☆';
  }).join('');

  return <div className="bkStars">{stars}</div>;
}

function BookCard({ book }) {
  return (
    <div className="bkCard">
      <div className="bkCoverWrap">
        <img className="bkCover" src={book.cover} alt={book.title} />
      </div>

      <div className="bkMeta">
        <div className="bkTitle" title={book.title}>
          {book.title}
        </div>
        <div className="bkAuthor">{book.author}</div>

        <div className="bkBottom">
          <div className="bkRating">
            <Stars value={book.rating} />
            <span className="bkRatingNum">{book.rating.toFixed(1)}</span>
          </div>

          <div className="bkPrice">${book.price.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

export default function BooksPage() {
  const navigate = useNavigate();

  const [cat, setCat] = useState('all');
  const [view, setView] = useState('grid'); // keep it even if you don't use it now

  const categories = useMemo(
    () => [
      { id: 'all', label: 'All Genre' },
      { id: 'fiction', label: 'Fiction' },
      { id: 'nonfiction', label: 'Non-fiction' },
      { id: 'mystery', label: 'Mystery' },
      { id: 'scifi', label: 'Sci-Fi & Fantasy' },
      { id: 'romance', label: 'Romance' },
    ],
    []
  );

  const books = useMemo(
    () => [
      {
        id: 1,
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        rating: 4.6,
        price: 13.99,
        cover:
          'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=70',
        cat: 'fiction',
      },
      {
        id: 2,
        title: 'The Power of Mind',
        author: 'J. R. Hudson',
        rating: 4.3,
        price: 13.99,
        cover:
          'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=70',
        cat: 'nonfiction',
      },
      {
        id: 3,
        title: 'Darkhill School',
        author: 'M. A. Cohen',
        rating: 4.2,
        price: 13.99,
        cover:
          'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=70',
        cat: 'mystery',
      },
      {
        id: 4,
        title: 'Fall to Earth',
        author: 'E. N. Kline',
        rating: 4.1,
        price: 13.99,
        cover:
          'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=600&q=70',
        cat: 'scifi',
      },
      {
        id: 5,
        title: 'Beloved Girls',
        author: 'Harriet Evans',
        rating: 4.4,
        price: 13.99,
        cover:
          'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=70',
        cat: 'fiction',
      },
      {
        id: 6,
        title: 'Five Feet Apart',
        author: 'Rachael Lippincott',
        rating: 4.5,
        price: 13.99,
        cover:
          'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=70',
        cat: 'romance',
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    if (cat === 'all') return books;
    return books.filter((b) => b.cat === cat);
  }, [books, cat]);

  // ✅ this is what happens when user picks from SearchOverlay
  const handlePick = (value) => {
    const picked = String(value || '').trim();

    // 1) if user clicked a category name -> set category
    const matchCat = categories.find(
      (c) => c.label.toLowerCase() === picked.toLowerCase()
    );
    if (matchCat) {
      setCat(matchCat.id);
      return;
    }

    // 2) if user clicked a section -> navigate
    const key = picked.toLowerCase();
    if (key === 'books') navigate('/books');
    if (key === 'customers') navigate('/customers');
    if (key === 'orders') navigate('/orders');
    if (key === 'settings') navigate('/settings');
  };

  return (
    <div className="bkPage">
      {/* Search */}
      <div className="bkTopRow">
        <SearchOverlay
          placeholder="What are you looking for?"
          shortcutHint="⌘K"
          trendingItems={categories
            .filter((c) => c.id !== 'all')
            .map((c) => c.label)}
          newInItems={['Books', 'Customers', 'Orders', 'Settings']}
          onPick={handlePick}
        />
        <ViewToggle value={view} onChange={setView} />
      </div>

      {/* Categories */}
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

      {/* Books */}
      <div className="bkGridHead">
        <div className="bkGridTitle">Browse books</div>
        <div className="bkGridHint">{filtered.length} items</div>
      </div>

      <div className="bkGrid">
        {filtered.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
    </div>
  );
}
