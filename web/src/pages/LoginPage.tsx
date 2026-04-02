import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage('If the email exists, a reset link has been sent.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{mode === 'login' ? 'Sign In' : 'Forgot Password'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in with your email and password.'
            : 'Enter your email and we will send a reset link.'}
        </p>

        <form onSubmit={mode === 'login' ? handleLogin : handleForgotPassword} className="auth-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {mode === 'login' && (
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Send Reset Email'}
          </button>
        </form>

        {mode === 'login' ? (
          <button className="auth-link" onClick={() => setMode('forgot')}>
            Forgot password?
          </button>
        ) : (
          <button className="auth-link" onClick={() => setMode('login')}>
            Back to login
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
