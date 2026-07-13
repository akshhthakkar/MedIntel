import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await api.get(`/notifications?page=${pageNum}&limit=20`);
      if (res.data.success) {
        if (pageNum === 1) {
          setNotifications(res.data.data.notifications);
        } else {
          setNotifications(prev => [...prev, ...res.data.data.notifications]);
        }
        setHasMore(res.data.data.pagination.hasNext);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      if (pageNum === 1) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const markRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.read) await markRead(notif._id);
    let navUrl = notif.url;
    try {
      if (notif.url && notif.url.startsWith('http')) {
        const urlObj = new URL(notif.url);
        navUrl = urlObj.pathname;
      }
    } catch (e) {}
    if (navUrl) navigate(navUrl);
  };

  const getIcon = (type) => {
    const icons = {
      report_ready: '📋',
      abnormal_result: '⚠️',
      medication_reminder: '💊',
      medication_missed: '⏰',
      daily_checkin: '👋',
      weekly_summary: '📊',
    };
    return icons[type] || '🔔';
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary-600" />
          Notifications
        </h1>
        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-800 bg-primary-50 px-4 py-2 rounded-lg transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
            <p className="text-gray-500 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <li 
                key={notif._id}
                onClick={() => handleNotifClick(notif)}
                className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-4 ${!notif.read ? 'bg-primary-50/30' : ''}`}
              >
                <div className="flex-shrink-0 text-3xl mt-0.5">
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className={`text-base sm:text-lg ${!notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {notif.heading}
                    </p>
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap hidden sm:block">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className={`text-sm sm:text-base mt-1 ${!notif.read ? 'text-gray-800' : 'text-gray-600'}`}>
                    {notif.message}
                  </p>
                  <span className="text-xs text-gray-500 mt-2 block sm:hidden">
                    {formatTime(notif.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                  {!notif.read && (
                    <button
                      onClick={(e) => markRead(notif._id, e)}
                      className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors tooltip-trigger"
                      title="Mark as read"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => deleteNotification(notif._id, e)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip-trigger"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchNotifications(nextPage);
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Load previous notifications
          </button>
        </div>
      )}
    </div>
  );
}
