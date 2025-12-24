import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function AvatarUploader({ user, onUpdated }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (!user?.id) return null;
    const raw = preview || user.avatar_url || 'https://via.placeholder.com/128?text=Avatar';
    const current = typeof raw === 'string' && raw.startsWith('/') ? `${API_BASE}${raw}` : raw;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
                src={current}
                alt="Avatar"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        setError('');
                        if (!f) { setFile(null); setPreview(null); return; }
                        if (f.size > 2 * 1024 * 1024) { setError('Max file size 2MB'); return; }
                        setFile(f);
                        const url = URL.createObjectURL(f);
                        setPreview(url);
                    }}
                />
                <button
                    disabled={!file || busy}
                    onClick={async () => {
                        if (!file) return;
                        setBusy(true);
                        setError('');
                        try {
                            const fd = new FormData();
                            fd.append('avatar', file);
                            const res = await fetch(`${API_BASE}/api/customers/${user.id}/avatar`, {
                                method: 'POST',
                                body: fd,
                                credentials: 'include',
                            });
                            const data = await res.json();
                            if (!res.ok || !data.ok) throw new Error(data.error || `Upload failed (${res.status})`);
                            setFile(null);
                            setPreview(null);
                            onUpdated?.(data.avatar_url);
                        } catch (e) {
                            setError(e.message || 'Upload failed');
                        } finally {
                            setBusy(false);
                        }
                    }}
                    style={{
                        height: 36,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        background: '#4f46e5',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    {busy ? 'Uploading…' : 'Upload'}
                </button>
            </div>
            {error ? <div style={{ color: '#ef4444', fontWeight: 600 }}>{error}</div> : null}
        </div>
    );
}
