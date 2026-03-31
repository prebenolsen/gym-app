import { useUnit } from '../context/UnitContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { unit, setUnit } = useUnit();

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <p className="settings-subtitle">
        Choose your preferred unit for weight display across the web app.
      </p>

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
