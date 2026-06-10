import { useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/stores/languageStore';
import { cn } from '@/lib/utils';

export function SecuritySection() {
  const { t } = useTranslation();
  const changePassword = useAuthStore((state) => state.changePassword);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);

    if (newPassword.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOk(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setError(t('invalidCurrentPassword'));
      } else {
        setError((err as { detail?: string }).detail ?? 'Error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PasswordField
        id="profile-old-password"
        label={t('currentPassword')}
        value={oldPassword}
        onChange={setOldPassword}
        visible={showOld}
        toggleVisible={() => setShowOld((v) => !v)}
        autoComplete="current-password"
      />
      <PasswordField
        id="profile-new-password"
        label={t('newPassword')}
        value={newPassword}
        onChange={setNewPassword}
        visible={showNew}
        toggleVisible={() => setShowNew((v) => !v)}
        autoComplete="new-password"
      />
      <PasswordField
        id="profile-confirm-password"
        label={t('confirmPassword')}
        value={confirmPassword}
        onChange={setConfirmPassword}
        visible={showNew}
        toggleVisible={() => setShowNew((v) => !v)}
        autoComplete="new-password"
      />

      {error && (
        <div className="flex items-center gap-2 text-xs text-[var(--status-critical)]">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 text-xs text-[var(--status-normal)]">
          <Check className="w-3.5 h-3.5" />
          {t('passwordChanged')}
        </div>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={submitting || !oldPassword || !newPassword || !confirmPassword}
        className="w-full"
      >
        {t('changePassword')}
      </Button>
    </form>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  toggleVisible: () => void;
  autoComplete?: string;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  toggleVisible,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={cn(
            'w-full px-3 py-2 pr-9 text-sm border border-[var(--border-default)] rounded-sm',
            'bg-[var(--bg-surface)] text-[var(--text-primary)]',
            'focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none'
          )}
        />
        <button
          type="button"
          onClick={toggleVisible}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
