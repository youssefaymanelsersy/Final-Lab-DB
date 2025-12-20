import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/LoginPage.css';
import bookphoto from '../assets/bookphoto2.jpeg';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // "login" | "signup"
  const isSignup = mode === 'signup';
  const navigate = useNavigate();

  // ✅ fake login inputs
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');

  const bgStyle = useMemo(
    () => ({
      backgroundImage: `url(${bookphoto})`,
    }),
    []
  );

  const switchToLogin = () => {
    setMode('login');
    setLoginErr('');
  };
  const switchToSignup = () => setMode('signup');

  const onLoginSubmit = (e) => {
    e.preventDefault();
    setLoginErr('');

    const u = loginUser.trim().toLowerCase();
    const p = loginPass;

    if (u === 'ahmed' && p === '1234') {
      // ✅ "session" for now
      localStorage.setItem('auth_user', 'ahmed');
      localStorage.setItem('auth_ok', '1');
      navigate('/books');
      return;
    }

    setLoginErr('Wrong username or password.');
  };

  const onSignupSubmit = (e) => {
    e.preventDefault();
    alert('Signup disabled for now. Use: ahmed / 1234');
    switchToLogin();
  };

  return (
    <div className="authPage" style={bgStyle}>
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
            {/* Login form */}
            <div className={`authFormWrap ${!isSignup ? 'show' : 'hide'}`}>
              <h1 className="authTitle">Welcome back</h1>
              <p className="authSub">
                Use: <b>ahmed</b> / <b>1234</b> for now.
              </p>

              <form className="authForm" onSubmit={onLoginSubmit}>
                <label className="authLabel">
                  Username
                  <input
                    className="authInput"
                    type="text"
                    placeholder="ahmed"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    required
                  />
                </label>

                <label className="authLabel">
                  Password
                  <input
                    className="authInput"
                    type="password"
                    placeholder="1234"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    required
                  />
                </label>

                {loginErr ? <div className="authError">{loginErr}</div> : null}

                <button className="authBtnPrimary" type="submit">
                  Login
                </button>

                <p className="authHint">Signup is disabled for now.</p>
              </form>
            </div>

            {/* Signup form (disabled) */}
            <div className={`authFormWrap ${isSignup ? 'show' : 'hide'}`}>
              <h1 className="authTitle">Create account</h1>
              <p className="authSub">
                Signup is not enabled yet. Use <b>ahmed</b> / <b>1234</b>.
              </p>

              <form className="authForm" onSubmit={onSignupSubmit}>
                <button className="authBtnPrimary" type="submit">
                  Back to Login
                </button>
              </form>
            </div>
          </section>

          <aside className="authPanel authPanelRight">
            <div className="authRightInner">
              <div className="authRightBadge">Prototype Mode</div>

              <h2 className="authRightTitle">
                {isSignup ? 'Login instead' : 'No signup yet'}
              </h2>
              <p className="authRightSub">
                We’re keeping it simple now: one demo user for testing.
              </p>

              <button
                className="authBtnGhost"
                type="button"
                onClick={isSignup ? switchToLogin : switchToSignup}
              >
                {isSignup ? 'Go to Login' : 'See Signup'}
              </button>

              <div className="authRightFooter">
                <span className="authTiny">user: ahmed</span>
                <span className="authTiny">pass: 1234</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
