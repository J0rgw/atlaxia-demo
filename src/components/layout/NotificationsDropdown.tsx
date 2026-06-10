import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/timeUtils';
import { useTranslation } from '@/stores/languageStore';
import { useNotificationStore, type Notification } from '@/stores/notificationStore';

export function NotificationsDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const dismiss = useNotificationStore((state) => state.dismiss);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return <Info className="w-4 h-4 text-[var(--status-advisory)]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[var(--status-warning)]" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-[var(--status-critical)]" />;
    }
  };

  const formatTime = formatTimestamp;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-sm hover:bg-[var(--bg-inset)] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-[var(--status-critical)] rounded-full text-[10px] text-white font-readout font-medium flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-surface)] rounded-md shadow-lg border border-[var(--border-subtle)] overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">{t('notifications')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[var(--text-secondary)] text-sm">
                {t('noNotifications')}
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    'px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-inset)] cursor-pointer transition-colors',
                    !notification.read && 'bg-[var(--status-advisory-muted)]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {notification.name}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismiss(notification.id);
                          }}
                          className="p-1 hover:bg-[var(--bg-inset)] rounded"
                        >
                          <X className="w-3 h-3 text-[var(--text-muted)]" />
                        </button>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {notification.alertType}
                        {notification.ipOrigin ? ` - ${notification.ipOrigin}` : ''}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/alerts');
              }}
              className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 py-1"
            >
              {t('viewAllAlerts')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
