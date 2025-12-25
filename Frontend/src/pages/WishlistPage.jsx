import { useEffect, useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import '../Styles/WishlistPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const formatPrice = (value) =>
    Number(value ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function WishlistPage() {
    const { user } = useOutletContext();
    const navigate = useNavigate();
    const customerId = user?.id;

    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadWishlist = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/customers/${customerId}/wishlist`, {
                credentials: 'include',
            });
            const data = await res.json();
            if (data.ok) {
                setWishlist(data.items || []);
            } else {
                setError(data.error || 'Failed to load wishlist');
            }
        } catch (e) {
            setError(e.message || 'Failed to load wishlist');
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => {
        if (!customerId) {
            navigate('/auth');
            return;
        }
        loadWishlist();
    }, [customerId, navigate, loadWishlist]);

    async function removeFromWishlist(isbn) {
        try {
            const res = await fetch(`${API_BASE}/api/customers/${customerId}/wishlist/${isbn}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await res.json();
            if (data.ok) {
                setWishlist((prev) => prev.filter((item) => item.isbn !== isbn));
            } else {
                alert(data.error || 'Failed to remove');
            }
        } catch (e) {
            console.error('Failed to remove from wishlist:', e);
            alert('Failed to remove from wishlist');
        }
    }

    async function addToCart(isbn) {
        try {
            const res = await fetch(`${API_BASE}/api/customers/${customerId}/cart`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ isbn, qty: 1 }),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Added to cart!');
            } else {
                alert(data.error || 'Failed to add to cart');
            }
        } catch (e) {
            console.error('Failed to add to cart:', e);
            alert('Failed to add to cart');
        }
    }

    if (loading) {
        return (
            <div className="booksPage">
                <div className="loading">Loading wishlist...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="booksPage">
                <div className="error">{error}</div>
            </div>
        );
    }

    return (
        <div className="booksPage">
            <div className="booksHeader">
                <h1 className="booksTitle">
                    <Heart size={32} style={{ marginRight: '12px', color: '#e74c3c' }} />
                    My Wishlist
                </h1>
                <p className="booksSubtitle">{wishlist.length} saved books</p>
            </div>

            {wishlist.length === 0 ? (
                <div className="emptyState">
                    <Heart size={64} color="#ccc" />
                    <h2>Your wishlist is empty</h2>
                    <p>Start adding books you want to read later!</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/c/books')}
                        style={{ marginTop: '20px' }}
                    >
                        Browse Books
                    </button>
                </div>
            ) : (
                <div className="booksGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {wishlist.map((book) => (
                        <div key={book.isbn} className="bookCard">
                            <div className="bookCover">
                                {book.cover_url ? (
                                    <img src={book.cover_url} alt={book.title} />
                                ) : (
                                    <div className="bookCoverPlaceholder">{book.title[0]}</div>
                                )}
                            </div>
                            <div className="bookInfo">
                                <h3 className="bookTitle">{book.title}</h3>
                                <p className="bookMeta">{book.publisher_name}</p>
                                <p className="bookMeta">{book.publication_year}</p>
                                <p className="bookPrice">${formatPrice(book.selling_price)}</p>
                                <div className="bookStock">
                                    {book.stock_qty > 0 ? (
                                        <span className="inStock">In Stock ({book.stock_qty})</span>
                                    ) : (
                                        <span className="outStock">Out of Stock</span>
                                    )}
                                </div>
                                <div className="bookActions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => addToCart(book.isbn)}
                                        disabled={book.stock_qty === 0}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        <ShoppingCart size={16} />
                                        Add to Cart
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => removeFromWishlist(book.isbn)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px' }}
                                        title="Remove from wishlist"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p className="bookMeta" style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                                    Added {new Date(book.added_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
