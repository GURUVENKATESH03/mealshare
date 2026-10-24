import React from 'react';
import { useStore } from '../domain/store.tsx';
import { X, Bell, CheckCheck } from 'lucide-react';

interface NotificationsModalProps {
  onClose: () => void;
  onNavigateTo: (linkType?: string, linkId?: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onNavigateTo,
}) => {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead, triggerMockRequestToast } = useStore();

  const myNotifications = notifications.filter((n) => n.user_id === currentUser?.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8DEC9] shadow-2xl p-6 my-8">
        {/* Header with clean flex alignment so Mark All Read and Close never collide */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E8DEC9]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#D97706]/10 text-[#D97706] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <h2 id="notif-title" className="font-display font-bold text-lg text-[#1E1611]">
                Notification Center
              </h2>
              <span className="text-[11px] text-[#7E7063] block">
                Live toasts trigger automatically for incoming claims
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {myNotifications.length > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs text-[#2D6A4F] hover:text-[#1B4332] font-semibold flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-[#E8F5EE]"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#F3ECE1] text-[#7E7063] hover:text-[#1E1611] transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="mt-4 max-h-96 overflow-y-auto space-y-2.5 pr-0.5">
          {myNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7E7063]">
              No notifications right now. Activity on your donations and claims will appear here and via live toast alerts.
            </div>
          ) : (
            myNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markNotificationRead(n.id);
                  if (n.link_type && n.link_id) {
                    onNavigateTo(n.link_type, n.link_id);
                  }
                }}
                className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex flex-col gap-1 ${
                  n.is_read
                    ? 'bg-[#FAF7F2] border-[#E8DEC9] text-[#7E7063]'
                    : 'bg-white border-[#D97706]/40 shadow-xs text-[#1E1611]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" />}
                    {n.title}
                  </span>
                  <span className="text-[10px] font-mono text-[#7E7063]">
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-[#4E4035] leading-relaxed">{n.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions: simulate toast & close */}
        <div className="mt-5 pt-3 border-t border-[#E8DEC9] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              triggerMockRequestToast();
              onClose();
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#2D6A4F]/10 hover:bg-[#2D6A4F]/20 text-[#2D6A4F] border border-[#2D6A4F]/30 transition-colors flex items-center gap-1.5"
          >
            <span>Simulate Request Toast</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#4E4035] hover:text-[#1E1611] border border-[#E8DEC9] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
