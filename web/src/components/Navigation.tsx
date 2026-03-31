import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/active-workout') {
      return location.pathname === '/active-workout';
    }
    if (path === '/calendar') {
      return location.pathname === '/calendar' || location.pathname.startsWith('/workout-history');
    }
    if (path === '/settings') {
      return location.pathname === '/settings';
    }
    return location.pathname === path;
  };

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1>Gym App</h1>
      </div>

      <ul className="nav-links">
        <li>
          <Link className={isActive('/') ? 'active' : ''} to="/">
            Home
          </Link>
        </li>
        <li>
          <Link
            className={isActive('/active-workout') ? 'active' : ''}
            to="/active-workout"
          >
            Active Workout
          </Link>
        </li>
        <li>
          <Link className={isActive('/calendar') ? 'active' : ''} to="/calendar">
            Calendar
          </Link>
        </li>
        <li>
          <Link className={isActive('/settings') ? 'active' : ''} to="/settings">
            Settings
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
