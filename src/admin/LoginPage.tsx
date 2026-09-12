import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AdminApiError, checkLogin, login, MOCK } from './api';

function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/admin') ? raw : '/admin/links';
}

/** `/admin` — password prompt. A valid `sc_admin` cookie skips straight through. */
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in? `GET /api/admin/login` → { ok } says whether the cookie is valid.
  useEffect(() => {
    let alive = true;
    void checkLogin().then((ok) => {
      if (alive && ok) navigate(next, { replace: true });
    });
    return () => {
      alive = false;
    };
  }, [navigate, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) setError('That password is not right.');
      else setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <img className="admin-login-mark sc-logo-glow" src="/assets/logos/logo-white.svg" alt="" />
        <div className="sc-label">Stable Chaos · Admin</div>
        <h1 className="admin-login-title">Sign in</h1>
        <label className="admin-field">
          <span className="admin-field-label">Password</span>
          <input
            className="admin-input"
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </label>
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="admin-btn admin-btn--primary admin-login-submit" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {MOCK ? <p className="admin-hint">Mock mode · the password is “admin”.</p> : null}
      </form>
    </div>
  );
}
