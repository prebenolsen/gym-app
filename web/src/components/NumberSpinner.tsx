import './NumberSpinner.css';

interface NumberSpinnerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

const NumberSpinner = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
}: NumberSpinnerProps) => {
  const handleIncrease = () => {
    if (value < max) onChange(value + step);
  };

  const handleDecrease = () => {
    if (value > min) onChange(value - step);
  };

  return (
    <div className="number-spinner">
      {label && <label>{label}</label>}
      <div className="spinner-controls">
        <button onClick={handleDecrease} className="spinner-btn">
          ▼
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || min;
            if (newValue >= min && newValue <= max) {
              onChange(newValue);
            }
          }}
          className="spinner-input"
          disabled
        />
        <button onClick={handleIncrease} className="spinner-btn">
          ▲
        </button>
      </div>
    </div>
  );
};

export default NumberSpinner;
