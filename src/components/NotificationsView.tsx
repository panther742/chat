import React from 'react';
import { Bell, CheckCheck, Sliders } from 'lucide-react';
import type { AppNotification, NotificationPreferences } from '../types/platform';

interface NotificationsViewProps {
  notifications: AppNotification[];
  preferences: NotificationPreferences;
  onMarkAllRead: () => Promise<void>;
  onUpdatePreferences: (patch: Partial<NotificationPreferences>) => Promise<void>;
  onSelectNotificationTarget: (notif: AppNotification) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  preferences,
  onMarkAllRead,
  onUpdatePreferences,
  onSelectNotificationTarget,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#11141E] p-5">
          <div>
            <h1 className="text-xl font-bold text-white">In-App Activity &amp; Notifications</h1>
            <p className="text-xs text-slate-400">
              Real-time WebSocket activity stream for likes, comments, follows, mentions, and DMs
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1.5 rounded-xl bg-[#6366F1] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-12 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-500 mb-2" />
              <p className="text-sm font-medium text-slate-300">You’re all caught up.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => onSelectNotificationTarget(notif)}
                className={`w-full flex items-start justify-between gap-4 rounded-2xl border p-4 text-left transition cursor-pointer ${
                  notif.read
                    ? 'border-slate-800/80 bg-[#11141E] text-slate-300'
                    : 'border-indigo-500/40 bg-indigo-950/20 text-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-white">{notif.title}</span>
                    {!notif.read && (
                      <span className="text-[11px] font-semibold text-indigo-400">· Unread</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{notif.body}</p>
                </div>
                <span className="text-xs text-slate-500 tabular-nums shrink-0">
                  {new Date(notif.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Notification Preferences */}
      <div className="lg:col-span-4">
        <div className="rounded-2xl border border-slate-800 bg-[#11141E] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Sliders className="h-4 w-4 text-indigo-400" />
            <span>Notification Preferences</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Control which real-time events generate in-app notifications. (External mobile push/email requires external provider credentials.)
          </p>

          <div className="space-y-2.5">
            {(
              [
                { key: 'directMessages', label: 'Direct & Group Messages' },
                { key: 'mentionsAndReplies', label: 'Mentions & Channel Replies' },
                { key: 'likesAndComments', label: 'Post Likes & Comments' },
                { key: 'newFollowers', label: 'New Followers' },
                { key: 'communityInvites', label: 'Community Server Invitations' },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0B0D13] p-3 text-xs text-slate-200 cursor-pointer"
              >
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={preferences[item.key]}
                  onChange={(e) => onUpdatePreferences({ [item.key]: e.target.checked })}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
