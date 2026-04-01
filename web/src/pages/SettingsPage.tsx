import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useUnit, type WeightUnit } from '../context/UnitContext';
import { useTheme, type AccentColor } from '../context/ThemeContext';

const ACCENT_OPTIONS: { value: AccentColor; label: string; swatch: string; ring: string }[] = [
  { value: 'emerald', label: 'Emerald', swatch: '#10b981', ring: 'ring-emerald-500' },
  { value: 'auburn', label: 'Burned Auburn', swatch: '#c65a1e', ring: 'ring-orange-700' },
];

const SettingsPage = () => {
  const { unit, setUnit } = useUnit();
  const { theme, setTheme, accent, setAccent } = useTheme();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Personalize your gym experience with preferred units and appearance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
            <span className="font-medium text-foreground">Dark Mode</span>
            <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-3 font-medium text-foreground">Accent Color</p>
            <div className="flex gap-3">
              {ACCENT_OPTIONS.map((option) => {
                const selected = accent === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setAccent(option.value)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-all',
                      selected
                        ? 'border-transparent ring-2 ring-offset-2 ring-offset-background text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground',
                      selected && option.ring
                    )}
                  >
                    <span
                      className="h-4 w-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: option.swatch }}
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Weight Unit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Weight unit">
            {[
              { value: 'kg' as WeightUnit, label: 'Kilograms (kg)' },
              { value: 'lb' as WeightUnit, label: 'Pounds (lb)' },
            ].map((option) => {
              const selected = unit === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                    selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/60'
                  )}
                >
                  <input
                    type="radio"
                    name="weightUnit"
                    value={option.value}
                    checked={selected}
                    onChange={() => setUnit(option.value)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <span className="font-medium">{option.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
