import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Mail,
  Phone,
  MapPin,
  User,
  AtSign,
  Save,
  Lock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import '../Styles/MySettingsPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function MySettingsPage({ user }) {
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [message, setMessage] = useState(null);
  const [profile, setProfile] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    shipping_address: '',
    created_at: '',
  });

  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);

  const initials = useMemo(() => {
    const a = (profile.first_name || '').trim()[0] || '';
    const b = (profile.last_name || '').trim()[0] || '';
    return (a + b || 'CU').toUpperCase();
  }, [profile.first_name, profile.last_name]);

  const memberSince = useMemo(() => {
    if (!profile.created_at) return '—';
    const d = new Date(profile.created_at);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [profile.created_at]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [user?.id]);

  async function fetchProfile() {
    try {
      setLoading(true);
      setMessage(null);

      const res = await fetch(`${API_BASE}/api/customers/${user.id}`, {
        credentials: 'include',
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load profile');

      const p = data.data || data.customer || data.profile || data;

      setProfile({
        username: p.username || '',
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        email: p.email || '',
        phone: p.phone || '',
        shipping_address: p.shipping_address || '',
        created_at: p.created_at || '',
      });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  }

  function validateProfile() {
    const next = {};

    if (!profile.first_name.trim()) next.first_name = 'First name is required';
    if (!profile.last_name.trim()) next.last_name = 'Last name is required';
    if (!profile.username.trim()) next.username = 'Username is required';
    if (!profile.phone.trim()) next.phone = 'Phone is required';
    if (!profile.shipping_address.trim()) next.shipping_address = 'Address is required';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleProfileUpdate() {
    if (!user?.id) return;
    if (!validateProfile()) return;

    try {
      setSavingProfile(true);
      setMessage(null);

      const res = await fetch(`${API_BASE}/api/customers/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          shipping_address: profile.shipping_address,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Update failed');

      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setErrors({});
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  }

  function validatePassword() {
    const next = {};

    if (!passwords.old_password) next.old_password = 'Current password required';
    if (!passwords.new_password) next.new_password = 'New password required';
    if (passwords.new_password && passwords.new_password.length < 6) {
      next.new_password = 'Password must be at least 6 characters';
    }
    if (passwords.new_password !== passwords.confirm_password) {
      next.confirm_password = 'Passwords do not match';
    }

    setErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  }

  async function handlePasswordChange() {
    if (!user?.id) return;
    if (!validatePassword()) return;

    try {
      setSavingPass(true);
      setMessage(null);

      const res = await fetch(`${API_BASE}/api/customers/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          old_password: passwords.old_password,
          new_password: passwords.new_password,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Password change failed');

      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
      setErrors({});
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to change password' });
    } finally {
      setSavingPass(false);
    }
  }

  function onPickAvatar() {
    fileRef.current?.click();
  }

  function onAvatarSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // if (!['image/jpeg', 'image/png'].includes(file.type)) {
    //   setMessage({ type: 'error', text: 'Avatar must be JPG or PNG.' });
    //   e.target.value = '';
    //   return;
    // }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Max avatar size is 2MB.' });
      e.target.value = '';
      return;
    }

    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    setMessage({ type: 'success', text: 'Avatar selected (preview only).' });
  }

  if (!user) {
    return (
      <div className="msPage">
        <div className="msFull">
          <div className="msHead">
            <div>
              <div className="msTitle">Settings</div>
              <div className="msSub">Loading user…</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="msPage">
        <div className="msFull">
          <div className="msLoader">
            <div className="msSpinner" />
            <div className="msSub">Loading profile…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msPage">
      <div className="msFull">
        <div className="msHead">
          <div>
            <div className="msTitle">Settings</div>
            <div className="msSub">Manage your account information</div>
          </div>

          <div className="msMetaPill">
            <span className="msMetaLabel">Member since</span>
            <span className="msMetaVal">{memberSince}</span>
          </div>
        </div>

        {message && (
          <div className={`msAlert ${message.type === 'success' ? 'msAlertOk' : 'msAlertBad'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="msGrid">
          {/* Avatar card */}
          <div className="msCard">
            <div className="msCardTitle">Profile picture</div>

            <div className="msAvatarRow">
              <div className="msAvatarWrap">
                {avatarPreview ? (
                  <img className="msAvatarImg" src={avatarPreview} alt="avatar preview" />
                ) : (
                  <div className="msAvatar">{initials}</div>
                )}

                <button className="msCamBtn" type="button" onClick={onPickAvatar} title="Upload avatar">
                  <Camera size={16} />
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="msHiddenFile"
                  onChange={onAvatarSelected}
                />
              </div>

              <div className="msAvatarInfo">
                 <div className="msTiny">Camera button opens the picker.</div>
                <div className="msSub">JPG or PNG. Max size 2MB.</div>
                <div>Upload</div>
              </div>
            </div>
          </div>

          {/* Profile form */}
          <div className="msCard">
            <div className="msCardTitle">Personal information</div>

            <div className="msForm">
              <div className="msTwo">
                <div className="msField">
                  <label>First name</label>
                  <div className="msInput">
                    <User size={16} />
                    <input
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      placeholder="First name"
                    />
                  </div>
                  {errors.first_name && <div className="msErr">{errors.first_name}</div>}
                </div>

                <div className="msField">
                  <label>Last name</label>
                  <div className="msInput">
                    <User size={16} />
                    <input
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      placeholder="Last name"
                    />
                  </div>
                  {errors.last_name && <div className="msErr">{errors.last_name}</div>}
                </div>
              </div>

              <div className="msField">
                <label>Email address</label>
                <div className="msInput msReadOnly">
                  <Mail size={16} />
                  <input value={profile.email} readOnly />
                  <span className="msTag">Read-only</span>
                </div>
              </div>

              <div className="msField">
                <label>Username</label>
                <div className="msInput">
                  <AtSign size={16} />
                  <input
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    placeholder="username"
                  />
                </div>
                {errors.username && <div className="msErr">{errors.username}</div>}
              </div>

              <div className="msTwo">
                <div className="msField">
                  <label>Phone</label>
                  <div className="msInput">
                    <Phone size={16} />
                    <input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+20 ..."
                    />
                  </div>
                  {errors.phone && <div className="msErr">{errors.phone}</div>}
                </div>

                <div className="msField">
                  <label>Shipping address</label>
                  <div className="msInput">
                    <MapPin size={16} />
                    <input
                      value={profile.shipping_address}
                      onChange={(e) =>
                        setProfile({ ...profile, shipping_address: e.target.value })
                      }
                      placeholder="Street, City"
                    />
                  </div>
                  {errors.shipping_address && <div className="msErr">{errors.shipping_address}</div>}
                </div>
              </div>

              <button className="msBtn msBtnPrimary" type="button" onClick={handleProfileUpdate} disabled={savingProfile}>
                <Save size={18} /> {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>

          {/* Password card */}
          <div className="msCard">
            <div className="msCardTitle">Change password</div>

            <div className="msForm">
              <div className="msField">
                <label>Current password</label>
                <input
                  className="msPlain"
                  type="password"
                  value={passwords.old_password}
                  onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                />
                {errors.old_password && <div className="msErr">{errors.old_password}</div>}
              </div>

              <div className="msTwo">
                <div className="msField">
                  <label>New password</label>
                  <input
                    className="msPlain"
                    type="password"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                  />
                  {errors.new_password && <div className="msErr">{errors.new_password}</div>}
                </div>

                <div className="msField">
                  <label>Confirm</label>
                  <input
                    className="msPlain"
                    type="password"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                  />
                  {errors.confirm_password && <div className="msErr">{errors.confirm_password}</div>}
                </div>
              </div>

              <button className="msBtn msBtnDark" type="button" onClick={handlePasswordChange} disabled={savingPass}>
                <Lock size={18} /> {savingPass ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
