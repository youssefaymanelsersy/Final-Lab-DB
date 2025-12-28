import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import '../Styles/CheckoutSuccessPage.css';

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const completeOrder = async () => {
      if (!sessionId) {
        setError('Invalid session');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/checkout/complete-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to complete order');
        }

        console.log('✅ Order completed:', data);
      } catch (e) {
        console.error('Error completing order:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    completeOrder();
  }, [sessionId]);

  return (
    <div className="successPage">
      <div className="successCard">
        {loading ? (
          <div className="successLoading">
            <div className="spinner"></div>
            <p>Processing your order...</p>
          </div>
        ) : (
          <>
            <div className="successIcon">
              <CheckCircle size={64} color="#10b981" />
            </div>
            
            <h1 className="successTitle">Payment Successful!</h1>
            
            <p className="successMessage">
              Thank you for your purchase. Your order has been confirmed and will be processed shortly.
            </p>

            {error && (
              <div className="successError">
                <p>Note: {error}</p>
                <p>Your payment was successful, but there was an issue creating the order record. Please contact support with your session ID below.</p>
              </div>
            )}

            {sessionId && (
              <div className="successDetails">
                <p className="successSessionId">
                  Session ID: <code>{sessionId}</code>
                </p>
              </div>
            )}

            <div className="successActions">
              <button
                className="btn-primary"
                onClick={() => navigate('/c/orders')}
              >
                <Package size={18} />
                View My Orders
              </button>
              
              <button
                className="btn-secondary"
                onClick={() => navigate('/c/books')}
              >
                Continue Shopping
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
