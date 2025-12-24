import { Star, ShoppingBag, Minus, Plus, Pencil, Heart, MessageSquarePlus } from 'lucide-react';
import '../Styles/BooksPage.css';

export default function BookCard({
  book,
  qtyInCart = 0,
  onAddOne,
  onSetQty,
  onEdit,
  isInWishlist = false,
  onToggleWishlist,
  onReview,
  viewMode = 'grid',
}) {
  const isCustomer = typeof onAddOne === 'function';
  const coverSrc =
    book.cover_url || 'https://via.placeholder.com/300x420?text=No+Cover';
  const price = Number(book.selling_price || 0).toFixed(2);
  const avgRating = Number(book.avg_rating || 0);
  const reviewCount = Number(book.review_count || 0);

  // Stock Logic
  const inStock = book.stock_qty > 0;
  // Threshold logic: use book.threshold if valid, else default to 5
  const threshold =
    book.threshold !== undefined && book.threshold !== null
      ? book.threshold
      : 5;
  const isLowStock = !isCustomer && book.stock_qty <= threshold;

  const showCoverActionButtons = isCustomer && viewMode !== 'list';

  return (
    <div className="bkCard">
      <div className="bkCoverWrap">
        <img className="bkCover" src={coverSrc} alt={book.title} />
        {/* Admin Low Stock Badge */}
        {isLowStock && <div className="bkBadge error">Low Stock</div>}
        
        {/* Customer Review Button - Left side (cover overlay only in grid view) */}
        {showCoverActionButtons && onReview && (
          <button
            className="bkReviewBtn"
            onClick={(e) => {
              e.stopPropagation();
              onReview();
            }}
            aria-label="Write a review"
            title="Write a review"
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
              color: 'white',
            }}
          >
            <MessageSquarePlus size={18} />
          </button>
        )}
        
        {/* Customer Wishlist Heart - Right side (cover overlay only in grid view) */}
        {showCoverActionButtons && onToggleWishlist && (
          <button
            className="bkWishlistBtn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist();
            }}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Heart
              size={20}
              fill={isInWishlist ? '#e74c3c' : 'none'}
              stroke={isInWishlist ? '#e74c3c' : '#666'}
              strokeWidth={2}
            />
          </button>
        )}
      </div>

      <div className="bkMeta">
        <div className="bkTitle" title={book.title}>
          {book.title}
        </div>

        <div className="bkAuthor">
          {isCustomer ? 'Bestseller' : `Publisher #${book.publisher_id}`}
        </div>

        {/* Stock Status */}
        <div className="bkStock">
          {!isCustomer ? (
            <span
              style={{
                color: isLowStock ? '#ef4444' : 'inherit',
                fontWeight: isLowStock ? 600 : 400,
              }}
            >
              Stock: {book.stock_qty} (Min: {threshold})
            </span>
          ) : (
            <span
              style={{
                color: inStock ? '#10b981' : '#ef4444',
                fontWeight: 500,
              }}
            >
              {inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          )}
        </div>

        <div className="bkBottom">
          <div className="bkPrice">${price}</div>
          {reviewCount > 0 ? (
            <div className="bkRating">
              <Star size={14} fill="#fbbf24" stroke="none" />
              <span>{avgRating.toFixed(1)}</span>
              <span style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}>
                ({reviewCount})
              </span>
            </div>
          ) : (
            <div className="bkRating" style={{ color: '#999', fontSize: '13px' }}>
              No reviews
            </div>
          )}
        </div>

        {/* --- ACTIONS --- */}
        <div className="bkActions">
          {isCustomer ? (
            // CUSTOMER ACTIONS
            qtyInCart === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {viewMode === 'list' && (
                  <div className="bkInlineActs">
                    {onReview && (
                      <button
                        className="bkReviewBtn"
                        onClick={(e) => { e.stopPropagation(); onReview(); }}
                        aria-label="Write a review"
                        title="Write a review"
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                          color: 'white',
                        }}
                      >
                        <MessageSquarePlus size={16} />
                      </button>
                    )}
                    {onToggleWishlist && (
                      <button
                        className="bkWishlistBtn"
                        onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                        style={{
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        }}
                      >
                        <Heart
                          size={18}
                          fill={isInWishlist ? '#e74c3c' : 'none'}
                          stroke={isInWishlist ? '#e74c3c' : '#666'}
                          strokeWidth={2}
                        />
                      </button>
                    )}
                  </div>
                )}
                <button
                  className="bkBtnAdd"
                  onClick={onAddOne}
                  disabled={!inStock}
                >
                  <ShoppingBag size={16} strokeWidth={2.5} />
                  <span>{inStock ? 'Add to cart' : 'Sold out'}</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {viewMode === 'list' && (
                  <div className="bkInlineActs">
                    {onReview && (
                      <button
                        className="bkReviewBtn"
                        onClick={(e) => { e.stopPropagation(); onReview(); }}
                        aria-label="Write a review"
                        title="Write a review"
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                          color: 'white',
                        }}
                      >
                        <MessageSquarePlus size={16} />
                      </button>
                    )}
                    {onToggleWishlist && (
                      <button
                        className="bkWishlistBtn"
                        onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                        style={{
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        }}
                      >
                        <Heart
                          size={18}
                          fill={isInWishlist ? '#e74c3c' : 'none'}
                          stroke={isInWishlist ? '#e74c3c' : '#666'}
                          strokeWidth={2}
                        />
                      </button>
                    )}
                  </div>
                )}
                <div className="bkQtyPill">
                  <button
                    className="bkQtyBtn"
                    onClick={() => onSetQty(qtyInCart - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} strokeWidth={2.5} />
                  </button>

                  <span className="bkQtyNum">{qtyInCart}</span>

                  <button
                    className="bkQtyBtn"
                    onClick={() => onSetQty(qtyInCart + 1)}
                    disabled={qtyInCart >= book.stock_qty}
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )
          ) : (
            // ADMIN ACTIONS (Edit Button)
            <button
              className="bkBtnEdit"
              onClick={() => onEdit && onEdit(book)}
            >
              <Pencil size={14} /> Edit Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
