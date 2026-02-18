import React, { useState, useEffect } from 'react';
import notificationManager from '../utils/notifications';
import API from '../utils/api';

const NotificationSettings = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [settings, setSettings] = useState({
    dms: true,
    groups: true,
    mentions: true,
    sound: true,
    vibration: true
  });
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    loadSettings();
    checkSubscription();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await API.request('/api/user/notification-settings');
      setSettings(data.settings || settings);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const checkSubscription = async () => {
    if (!window.OneSignal) return;
    const subscribed = await window.OneSignal.Notifications.getPermission();
    setIsSubscribed(subscribed);
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationManager.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      setIsSubscribed(true);
      // Optionally tag user
      await notificationManager.setExternalUserId(JSON.parse(localStorage.getItem('user'))._id);
    }
  };

  const handleToggleSetting = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    try {
      await API.request('/api/user/notification-settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings)
      });
      if (key === 'sound') {
        localStorage.setItem('notificationSound', newSettings.sound.toString());
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setSettings(settings); // revert
    }
  };

  return (
    <div className="notification-settings">
      <h3>Notifications</h3>
      
      {permission === 'default' && (
        <div className="permission-prompt">
          <p>Enable notifications to stay updated on messages and activity</p>
          <button 
            className="btn btn-primary"
            onClick={handleEnableNotifications}
          >
            Enable Notifications
          </button>
        </div>
      )}

      {permission === 'denied' && (
        <div className="permission-denied">
          <p>Notifications are blocked. Please enable them in your browser settings.</p>
        </div>
      )}

      {permission === 'granted' && (
        <div className="settings-list">
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.dms}
                onChange={() => handleToggleSetting('dms')}
              />
              <span>Direct Messages</span>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.groups}
                onChange={() => handleToggleSetting('groups')}
              />
              <span>Group Messages</span>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.mentions}
                onChange={() => handleToggleSetting('mentions')}
              />
              <span>Mentions</span>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={() => handleToggleSetting('sound')}
              />
              <span>Notification Sound</span>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.vibration}
                onChange={() => handleToggleSetting('vibration')}
              />
              <span>Vibration</span>
            </label>
          </div>

          {isSubscribed && (
            <button 
              className="btn btn-secondary"
              onClick={async () => {
                await window.OneSignal.Notifications.setSubscription(false);
                setIsSubscribed(false);
              }}
            >
              Disable Push Notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;