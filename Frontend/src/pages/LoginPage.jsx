import { useMemo, useState } from 'react';
// REMOVED: import { useNavigate } from 'react-router-dom'; (Not needed anymore)
import '../Styles/LoginPage.css';
import bookphoto from '../assets/bookphoto2.jpeg';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const isSignup = mode === 'signup';
  // REMOVED: const navigate = useNavigate(); (App.jsx handles redirection)

  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup State
  const [suUsername, setSuUsername] = useState('');
  const [suFirst, setSuFirst] = useState('');
  const [suLast, setSuLast] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suAddress, setSuAddress] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suErr, setSuErr] = useState('');
  const [suLoading, setSuLoading] = useState(false);

  const bgStyle = useMemo(() => ({ backgroundImage: `url(${bookphoto})` }), []);

  const switchToLogin = () => {
    setMode('login');
    setLoginErr('');
    setSuErr('');
  };

  const switchToSignup = () => {
    setMode('signup');
    setLoginErr('');
    setSuErr('');
  };

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  const onLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginErr('');
    setLoginLoading(true);

    try {
      const data = await postJSON(`${API_BASE}/api/auth/login`, {
        username: loginUsername.trim(),
        password: loginPass,
      });
      if (onLogin) {
        onLogin(data.user);
      }
    } catch (err) {
      setLoginErr(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const onSignupSubmit = async (e) => {
    e.preventDefault();
    setSuErr('');
    setSuLoading(true);

    try {
      await postJSON(`${API_BASE}/api/auth/signup`, {
        username: suUsername.trim(),
        password: suPass,
        first_name: suFirst.trim(),
        last_name: suLast.trim(),
        email: suEmail.trim(),
        phone: suPhone.trim(),
        shipping_address: suAddress.trim(),
      });

      switchToLogin();
    } catch (err) {
      setSuErr(err.message || 'Signup failed');
    } finally {
      setSuLoading(false);
    }
  };

  return (
    <div className="authPage" style={bgStyle}>
      {/* ... (The rest of your JSX remains exactly the same) ... */}
      <div className="authOverlay" />
      <div className={`authCard ${isSignup ? 'isSignup' : ''}`}>
        <div className="authTop">
          <div className="authBrand">
            <span className="authDot" />
            <span className="authBrandText">BookStore</span>
          </div>
          <div className="authQuickActions">
            <button
              className={`authPill ${!isSignup ? 'active' : ''}`}
              onClick={switchToLogin}
              type="button"
            >
              Login
            </button>
            <button
              className={`authPill ${isSignup ? 'active' : ''}`}
              onClick={switchToSignup}
              type="button"
            >
              Sign up
            </button>
          </div>
        </div>

        <div className="authBody">
          <section className="authPanel authPanelLeft">
            {/* LOGIN FORM */}
            <div className={`authFormWrap ${!isSignup ? 'show' : 'hide'}`}>
              <h1 className="authTitle">Welcome back</h1>
              <p className="authSub">Login with your account.</p>
              <form className="authForm" onSubmit={onLoginSubmit}>
                <label className="authLabel">
                  Username
                  <input
                    className="authInput"
                    type="text"
                    placeholder="username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                  />
                </label>
                <label className="authLabel">
                  Password
                  <input
                    className="authInput"
                    type="password"
                    placeholder="••••••••"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    required
                  />
                </label>
                {loginErr && <div className="authError">{loginErr}</div>}
                <button
                  className="authBtnPrimary"
                  type="submit"
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            </div>

            {/* SIGNUP FORM */}
            <div className={`authFormWrap ${isSignup ? 'show' : 'hide'}`}>
              <h1 className="authTitle">Create account</h1>
              <p className="authSub">Fill your details to sign up.</p>
              <form className="authForm" onSubmit={onSignupSubmit}>
                <div className="authGrid2">
                  <label className="authLabel">
                    Username
                    <input
                      className="authInput"
                      type="text"
                      placeholder="user123"
                      value={suUsername}
                      onChange={(e) => setSuUsername(e.target.value)}
                      required
                    />
                  </label>
                  <label className="authLabel">
                    Phone
                    <input
                      className="authInput"
                      type="text"
                      placeholder="01xxxxxxxxx"
                      value={suPhone}
                      onChange={(e) => setSuPhone(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="authGrid2">
                  <label className="authLabel">
                    First name
                    <input
                      className="authInput"
                      type="text"
                      placeholder="First"
                      value={suFirst}
                      onChange={(e) => setSuFirst(e.target.value)}
                      required
                    />
                  </label>
                  <label className="authLabel">
                    Last name
                    <input
                      className="authInput"
                      type="text"
                      placeholder="Last"
                      value={suLast}
                      onChange={(e) => setSuLast(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="authLabel">
                  Email
                  <input
                    className="authInput"
                    type="email"
                    placeholder="email@example.com"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="authLabel">
                  Shipping Address
                  <input
                    className="authInput"
                    type="text"
                    placeholder="City, Country"
                    value={suAddress}
                    onChange={(e) => setSuAddress(e.target.value)}
                    required
                  />
                </label>
                <label className="authLabel">
                  Password
                  <input
                    className="authInput"
                    type="password"
                    placeholder="Strong password"
                    value={suPass}
                    onChange={(e) => setSuPass(e.target.value)}
                    required
                  />
                </label>
                {suErr && <div className="authError">{suErr}</div>}
                <button
                  className="authBtnPrimary"
                  type="submit"
                  disabled={suLoading}
                >
                  {suLoading ? 'Creating...' : 'Create account'}
                </button>
              </form>
            </div>
          </section>

          <aside className="authPanel authPanelRight">
            <div className="authRightInner">
              <div className="authRightBadge">Connected to Backend</div>
              <h2 className="authRightTitle">
                {isSignup ? 'Already have an account?' : 'New here?'}
              </h2>
              <p className="authRightSub">
                {isSignup
                  ? 'Switch to login and continue shopping.'
                  : 'Create an account and start browsing books.'}
              </p>
              <button
                className="authBtnGhost"
                type="button"
                onClick={isSignup ? switchToLogin : switchToSignup}
              >
                {isSignup ? 'Go to Login' : 'Go to Signup'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
