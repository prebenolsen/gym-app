import { useState, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useUnit, type WeightUnit } from '../context/UnitContext';
import { useTheme, type AccentColor } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useApi } from '../hooks/useApi';

const ACCENT_OPTIONS: { value: AccentColor; label: string; swatch: string; ring: string }[] = [
  { value: 'emerald', label: 'Emerald', swatch: '#10b981', ring: 'ring-emerald-500' },
  { value: 'auburn', label: 'Burned Auburn', swatch: '#c65a1e', ring: 'ring-orange-700' },
];

const SettingsPage = () => {
  const { unit, setUnit } = useUnit();
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    soundEnabled,
    setSoundEnabled,
    prepareSoundEnabled,
    setPrepareSoundEnabled,
    prepareSoundSeconds,
    setPrepareSoundSeconds,
  } = useTheme();
  const { signOut } = useAuth();
  const api = useApi();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('Password updated successfully.');
  };

  const handleDeleteAccount = async () => {
    setAccountError(null);
    setAccountMessage(null);
    const confirmed = window.confirm(
      'Delete your account and all data permanently? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await api.deleteAccount();
      await signOut();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      setAccountError(msg);
      return;
    }

    setAccountMessage('Account deleted.');
  };

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

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Sounds</p>
                <p className="text-sm text-muted-foreground">Enable countdown and completion beeps.</p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Prepare Cue</p>
                <p className="text-sm text-muted-foreground">Play a pre-countdown alert before the final beeps.</p>
              </div>
              <Switch
                checked={soundEnabled && prepareSoundEnabled}
                disabled={!soundEnabled}
                onCheckedChange={setPrepareSoundEnabled}
              />
            </div>

            {soundEnabled && prepareSoundEnabled ? (
              <div className="mt-4 flex max-w-xs flex-col gap-2">
                <label htmlFor="prepare-seconds" className="text-sm font-medium text-foreground">
                  Prepare At (seconds)
                </label>
                <input
                  id="prepare-seconds"
                  type="number"
                  min={1}
                  value={prepareSoundSeconds}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isInteger(next) && next >= 1) {
                      setPrepareSoundSeconds(next);
                    }
                  }}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
              </div>
            ) : null}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
            <span className="font-medium text-foreground">Log Out</span>
            <button
              onClick={() => signOut()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Log Out
            </button>
          </div>

          <form
            onSubmit={handleChangePassword}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <p className="mb-3 font-medium text-foreground">Change Password</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                required
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                required
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Update Password
              </button>
              {passwordError && <span className="text-sm text-destructive">{passwordError}</span>}
              {passwordMessage && <span className="text-sm text-primary">{passwordMessage}</span>}
            </div>
          </form>

          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <p className="mb-2 font-medium text-foreground">Delete Account</p>
            <p className="mb-3 text-sm text-muted-foreground">
              This permanently deletes your account and all gym data.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteAccount}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
              >
                Delete Account
              </button>
              {accountError && <span className="text-sm text-destructive">{accountError}</span>}
              {accountMessage && <span className="text-sm text-primary">{accountMessage}</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
