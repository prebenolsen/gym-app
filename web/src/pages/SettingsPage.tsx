import { useRef, useEffect } from 'react';
import { useUnit } from '../context/UnitContext';
import { useTheme } from '../context/ThemeContext';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import './SettingsPage.css';

const SettingsPage = () => {
  const { unit, setUnit } = useUnit();
  const { theme, setTheme } = useTheme();
  const switchRef = useRef<any>(null);

  useEffect(() => {
    const switchElement = switchRef.current;
    if (!switchElement) return;

    const handleChange = (e: Event) => {
      const target = e.target as any;
      setTheme(target.checked ? 'dark' : 'light');
    };

    switchElement.addEventListener('sl-change', handleChange);
    return () => switchElement.removeEventListener('sl-change', handleChange);
  }, [setTheme]);

  useEffect(() => {
    if (switchRef.current) {
      switchRef.current.checked = theme === 'dark';
    }
  }, [theme]);

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
            ref={switchRef}
            checked={theme === 'dark'}
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
