import { useEffect, useState } from 'react';
import ViewToggle from '../components/ViewToggle.jsx';
import '../Styles/BooksPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [view, setView] = useState('grid');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/admin/customers`, { credentials: 'include' });
                const data = await res.json();
                if (data.ok) setCustomers(data.data);
                else setError(data.error || 'Failed to load customers');
            } catch {
                setError('Failed to load customers');
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    const customerCount = customers.length;

    return (
        <div className="bkPage">
            <div className="toggleBarPinned">
                <ViewToggle value={view} onChange={setView} />
            </div>
            <div className="bkCatsRow" style={{ paddingLeft: 70 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0 }}>Customers ({customerCount})</h2>
                </div>
            </div>
            {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
            {loading ? (
                <div style={{ textAlign: 'center', marginTop: 40 }}>Loading...</div>
            ) : (
                <div className={view === 'grid' ? 'bkGrid' : 'bkList'}>
                    {customers.map(c => (
                        <div key={c.id} className="bkCard" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <img
                                src={
                                    c.avatar_url
                                        ? c.avatar_url.startsWith('/api/customers/')
                                            ? `${API_BASE}${c.avatar_url}`
                                            : c.avatar_url
                                        : '/default-avatar.png'
                                }
                                alt={c.username}
                                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                            />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 18 }}>{c.username}</div>
                                <div style={{ color: '#555' }}>{c.first_name} {c.last_name}</div>
                                <div style={{ color: '#888', fontSize: 14 }}>{c.email}</div>
                                <div style={{ color: '#888', fontSize: 14 }}>{c.phone}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
