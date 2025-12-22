import { Star, ShoppingBag, Minus, Plus, Pencil } from 'lucide-react';
import '../Styles/BooksPage.css';

export default function BookCard({
  book,
  qtyInCart = 0,
  onAddOne,
  onSetQty,
  onEdit,
}) {
  const isCustomer = typeof onAddOne === 'function';
  const coverSrc =
    book.cover_url || 'https://via.placeholder.com/300x420?text=No+Cover';
  const price = Number(book.selling_price || 0).toFixed(2);
  const rating = 4.5;

  // Stock Logic
  const inStock = book.stock_qty > 0;
  // Threshold logic: use book.threshold if valid, else default to 5
  const threshold =
    book.threshold !== undefined && book.threshold !== null
      ? book.threshold
      : 5;
  const isLowStock = !isCustomer && book.stock_qty <= threshold;

  return (
    <div className="bkCard">
      <div className="bkCoverWrap">
        <img className="bkCover" src={coverSrc} alt={book.title} />
        {/* Admin Low Stock Badge */}
        {isLowStock && <div className="bkBadge error">Low Stock</div>}
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
          <div className="bkRating">
            <Star size={14} fill="#fbbf24" stroke="none" />
            <span>{rating}</span>
          </div>
        </div>

        {/* --- ACTIONS --- */}
        <div className="bkActions">
          {isCustomer ? (
            // CUSTOMER ACTIONS
            qtyInCart === 0 ? (
              <button
                className="bkBtnAdd"
                onClick={onAddOne}
                disabled={!inStock}
              >
                <ShoppingBag size={16} strokeWidth={2.5} />
                <span>{inStock ? 'Add to cart' : 'Sold out'}</span>
              </button>
            ) : (
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
