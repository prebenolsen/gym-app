import { useUnit } from '../context/UnitContext';
import { useTheme } from '../context/ThemeContext';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
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
        <div className="appearance-toggle">
          <span className="toggle-label">Dark Mode</span>
          <sl-switch
            checked={theme === 'dark'}
            onsl-change={(e: any) => setTheme(e.target.checked ? 'dark' : 'light')}
          ></sl-switch>
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
