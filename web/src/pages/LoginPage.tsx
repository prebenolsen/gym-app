import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signupError) {
          throw signupError;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          navigate('/');
          return;
        }

        setMessage(
          'Account created. If email confirmation is required, check your inbox.',
        );
        setMode('login');
      } else {
        await signIn(email.trim(), password);
        navigate('/');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

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
        <div className="auth-header">
          <img
            src="../../shared/assets/logo-weak-cursiv-k-barbell-under.svg"
            alt="GymApp logo"
            className="auth-logo-image"
          />
        </div>

        <form
          onSubmit={mode === 'forgot' ? handleForgotPassword : handleAuth}
          className="auth-form"
        >
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

          {(mode === 'login' || mode === 'signup') && (
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

          {mode === 'signup' && (
            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : mode === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Email'}
          </button>
        </form>

        {mode !== 'login' && (
          <button className="auth-link" onClick={() => setMode('login')}>
            Back to login
          </button>
        )}
        {mode !== 'signup' && (
          <button className="auth-link" onClick={() => setMode('signup')}>
            Create account
          </button>
        )}
        {mode !== 'forgot' && (
          <button className="auth-link" onClick={() => setMode('forgot')}>
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
