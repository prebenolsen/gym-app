import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type WeightUnit = 'kg' | 'lb';

type UnitContextValue = {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
  convertFromKg: (kg: number) => number;
  convertToKg: (value: number) => number;
  formatWeight: (kg: number, digits?: number) => string;
};

const STORAGE_KEY = 'gym-app.weight-unit';

const UnitContext = createContext<UnitContextValue | null>(null);

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [unit, setUnitState] = useState<WeightUnit>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'lb' ? 'lb' : 'kg';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unit);
  }, [unit]);

  const value = useMemo<UnitContextValue>(() => {
    const convertFromKg = (kg: number) => {
      if (unit === 'lb') {
        return kg * 2.2;
      }
      return kg;
    };

    const convertToKg = (input: number) => {
      if (unit === 'lb') {
        return input / 2.2;
      }
      return input;
    };

    const formatWeight = (kg: number, digits = 1) => {
      const converted = convertFromKg(kg);
      return `${converted.toFixed(digits)} ${unit}`;
    };

    return {
      unit,
      setUnit: setUnitState,
      convertFromKg,
      convertToKg,
      formatWeight,
    };
  }, [unit]);

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
};

export const useUnit = () => {
  const ctx = useContext(UnitContext);
  if (!ctx) {
    throw new Error('useUnit must be used inside UnitProvider');
  }
  return ctx;
};
