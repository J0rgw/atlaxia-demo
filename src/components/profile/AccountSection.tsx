import { User } from 'lucide-react';
import type { AuthSession } from '@/stores/authStore';

interface AccountSectionProps {
  session: AuthSession;
  roleLabel: string;
}

export function AccountSection({ session, roleLabel }: AccountSectionProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {session.username}
        </p>
        <p className="text-xs text-[var(--text-secondary)] truncate">{roleLabel}</p>
        {session.email && (
          <p className="text-xs text-[var(--text-muted)] truncate">{session.email}</p>
        )}
      </div>
    </div>
  );
}
