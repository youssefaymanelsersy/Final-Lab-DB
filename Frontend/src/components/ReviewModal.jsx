import { useState } from 'react';
import { X, Send } from 'lucide-react';
import StarRating from './StarRating';
import '../Styles/ReviewModal.css';

export default function ReviewModal({ book, user, onClose, onSubmitted }) {
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!rating) {
            setError('Please select a rating');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const res = await fetch(`/api/books/${book.isbn}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    customer_id: user.id,
                    rating,
                    review_text: reviewText.trim() || null,
                }),
            });

            const data = await res.json();

            if (data.ok) {
                onSubmitted && onSubmitted();
                onClose();
            } else {
                setError(data.error || 'Failed to submit review');
            }
        } catch (err) {
            console.error('Failed to submit review:', err);
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="review-modal-overlay" onClick={onClose}></div>
            <div className="review-modal">
                <div className="review-modal-header">
                    <h3>Write a Review</h3>
                    <button onClick={onClose} className="review-modal-close">
                        <X size={20} />
                    </button>
                </div>

                <div className="review-modal-book">
                    <img
                        src={book.cover_url || 'https://via.placeholder.com/60x90?text=Book'}
                        alt={book.title}
                        className="review-modal-cover"
                    />
                    <div>
                        <div className="review-modal-title">{book.title}</div>
                        <div className="review-modal-isbn">ISBN: {book.isbn}</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="review-modal-form">
                    <div className="review-form-group">
                        <label>Your Rating *</label>
                        <StarRating rating={rating} onRatingChange={setRating} />
                    </div>

                    <div className="review-form-group">
                        <label htmlFor="review-text">Your Review (optional)</label>
                        <textarea
                            id="review-text"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share your thoughts about this book..."
                            rows={5}
                            maxLength={1000}
                        />
                        <div className="review-char-count">
                            {reviewText.length}/1000
                        </div>
                    </div>

                    {error && <div className="review-error">{error}</div>}

                    <div className="review-modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="review-btn-cancel"
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="review-btn-submit"
                            disabled={submitting}
                        >
                            <Send size={16} />
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
