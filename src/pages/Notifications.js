import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { FiBell } from 'react-icons/fi';
import API from '../utils/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await API.request('/api/notifications');
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Mock data
      const mockNotifications = [
        {
          id: 1,
          type: 'welcome',
          title: 'Welcome to VesselX',
          description: "You're all set. Start exploring posts, AI picks, and Spaces.",
          time: '05:18 AM',
          read: false
        },
        {
          id: 2,
          type: 'ai_recommendations',
          title: 'New AI recommendations',
          description: 'VesselX AI has new content suggestions for you.',
          time: '04:18 AM',
          read: false
        }
      ];
      setNotifications(mockNotifications);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await API.request(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <>
      <Navbar user={user} />
      
      <main className="main-content">
        <div className="notifications-page">
          <div className="notifications-header">
            <div className="notifications-title-section">
              <FiBell size={28} className="notifications-icon" />
              <h1>Notifications</h1>
            </div>
            <p className="notifications-subtitle">Stay updated with what's happening</p>
          </div>
          
          <div className="notifications-list">
            {isLoading ? (
              <div className="loading-page">
                <span className="loading-spinner"></span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔔</div>
                <h3>No notifications</h3>
                <p>When you get notifications, they'll appear here</p>
              </div>
            ) : (
              <>
                <div className="demo-notice notifications-demo">
                  <div className="demo-icon">ℹ️</div>
                  <span>Demo notifications — content is simulated</span>
                </div>
                
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-card ${!notification.read ? 'unread' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="notification-icon">
                      {notification.type === 'welcome' && '👋'}
                      {notification.type === 'ai_recommendations' && '🤖'}
                      {notification.type === 'like' && '❤️'}
                      {notification.type === 'follow' && '👤'}
                      {notification.type === 'comment' && '💬'}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h3 className="notification-title">{notification.title}</h3>
                        <span className="notification-time">⏱️ {notification.time}</span>
                      </div>
                      <p className="notification-description">{notification.description}</p>
                      {!notification.read && (
                        <div className="unread-dot"></div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Notifications;