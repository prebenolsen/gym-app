import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import './Navigation.css';

const navItems = [
  { path: '/', label: 'Home', icon: '⚡' },
  { path: '/active-workout', label: 'Active Workout', icon: '🏋️' },
  { path: '/programs', label: 'Programs', icon: '📋' },
  { path: '/calendar', label: 'Calendar', icon: '📅' },
] as const;

const Navigation = () => {
  const location = useLocation();
  const api = useApi();
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [loadingActiveSession, setLoadingActiveSession] = useState(true);

  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        const session = await api.getActiveSession();
        setHasActiveSession(!!session);
      } catch (err) {
        console.error('Failed to fetch active workout session:', err);
        setHasActiveSession(false);
      } finally {
        setLoadingActiveSession(false);
      }
    };

    fetchActiveSession();
  }, [location.pathname, api]);

  const isActive = (path: string) => {
    if (path === '/active-workout') return location.pathname === '/active-workout';
    if (path === '/calendar')
      return (
        location.pathname === '/calendar' ||
        location.pathname.startsWith('/workout-history')
      );
    if (path === '/settings') return location.pathname === '/settings';
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navigation">
      <div className="nav-header">
        <img
          src="../../shared/assets/logo-weak-cursiv-k-barbell-under.svg"
          alt="GymApp logo"
          className="nav-logo-image"
        />
      </div>

      <ul className="nav-links">
        {navItems.map(({ path, label, icon }) => (
          <li key={path}>
            {path === '/active-workout' && (!hasActiveSession || loadingActiveSession) ? (
              <span className="nav-disabled" aria-disabled="true">
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </span>
            ) : (
              <Link className={isActive(path) ? 'active' : ''} to={path}>
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="nav-footer">
        <Link className={isActive('/settings') ? 'active' : ''} to="/settings">
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
