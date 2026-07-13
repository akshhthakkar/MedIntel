import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // ── Fetch notifications from backend ──────────────────
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications?limit=20');
      if (res.data.success) {
        const notifs = res.data.data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(res.data.data.unreadCount || notifs.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('[NotificationBell] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Mark a notification as read ───────────────────────
  const markRead = async (notifId) => {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notifId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationBell] markRead error:', err.message);
    }
  };

  // ── Mark all as read ──────────────────────────────────
  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationBell] markAllRead error:', err.message);
    }
  };

  // ── Delete a notification ─────────────────────────────
  const deleteNotification = async (notifId, e) => {
    e.stopPropagation(); // prevent clicking the notification body
    try {
      await api.delete(`/notifications/${notifId}`);
      setNotifications(prev => {
        const deleted = prev.find(n => n._id === notifId);
        if (deleted && !deleted.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n._id !== notifId);
      });
    } catch (err) {
      console.error('[NotificationBell] delete error:', err.message);
    }
  };

  // ── Handle notification click ─────────────────────────
  const handleNotifClick = async (notif) => {
    if (!notif.read) await markRead(notif._id);
    setOpen(false);
    
    // Extract internal route from URL if possible
    let navUrl = notif.url;
    try {
        if (notif.url && notif.url.startsWith('http')) {
            const urlObj = new URL(notif.url);
            navUrl = urlObj.pathname;
        }
    } catch(e) {}

    if (navUrl) navigate(navUrl);
  };

  // ── Fetch on mount + poll every 30s ──────────────────
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Close dropdown when clicking outside ─────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Format timestamp ─────────────────────────────────
  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // ── Icon by notification type ─────────────────────────
  const getIcon = (type) => {
    const icons = {
      report_ready:        '📋',
      abnormal_result:     '⚠️',
      medication_reminder: '💊',
      medication_missed:   '⏰',
      daily_checkin:       '👋',
      weekly_summary:      '📊',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-700
                   hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]
                           bg-red-500 text-white text-xs font-bold rounded-full
                           flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white
                        rounded-xl shadow-xl border border-gray-100
                        z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-600
                                 px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary-600 hover:text-primary-800
                           font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-gray-400 text-sm">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif._id}
                  onClick={() => handleNotifClick(notif)}
                  className={`
                    w-full text-left px-4 py-3 flex gap-3 items-start
                    border-b border-gray-50 last:border-0
                    hover:bg-gray-50 transition-colors
                    ${!notif.read ? 'bg-primary-50/40' : ''}
                  `}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug
                      ${!notif.read
                        ? 'font-semibold text-gray-900'
                        : 'text-gray-700'}`}>
                      {notif.heading}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notif.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 mt-1.5 pt-1">
                    {!notif.read && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full" />
                    )}
                    <button
                      onClick={(e) => deleteNotification(notif._id, e)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete notification"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <button
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
