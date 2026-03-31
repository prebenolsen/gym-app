import { useUnit } from '../context/UnitContext';
import { useTheme } from '../context/ThemeContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { unit, setUnit } = useUnit();
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <p className="settings-subtitle">
        Personalize the web experience with your preferred units and appearance.
      </p>

      <section className="settings-card">
        <h2>Appearance</h2>
        <div className="unit-options" role="radiogroup" aria-label="Theme mode">
          <label className={`unit-option ${theme === 'light' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="themeMode"
              value="light"
              checked={theme === 'light'}
              onChange={() => setTheme('light')}
            />
            <span>Light Mode</span>
          </label>

          <label className={`unit-option ${theme === 'dark' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="themeMode"
              value="dark"
              checked={theme === 'dark'}
              onChange={() => setTheme('dark')}
            />
            <span>Dark Mode</span>
          </label>
        </div>
      </section>

      <section className="settings-card">
        <h2>Weight Unit</h2>
        <div className="unit-options" role="radiogroup" aria-label="Weight unit">
          <label className={`unit-option ${unit === 'kg' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="weightUnit"
              value="kg"
              checked={unit === 'kg'}
              onChange={() => setUnit('kg')}
            />
            <span>Kilograms (kg)</span>
          </label>

          <label className={`unit-option ${unit === 'lb' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="weightUnit"
              value="lb"
              checked={unit === 'lb'}
              onChange={() => setUnit('lb')}
            />
            <span>Pounds (lb)</span>
          </label>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
