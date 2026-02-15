import API from './api';

class NotificationManager {
  constructor() {
    this.swRegistration = null;
    this.applicationServerKey = null;
    this.permission = Notification.permission;
    this.initialize();
  }

  async initialize() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
        await this.fetchVapidKey();
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async fetchVapidKey() {
    try {
      const response = await API.request('/api/push/vapid-public-key');
      this.applicationServerKey = response.publicKey;
    } catch (error) {
      console.error('Failed to fetch VAPID key:', error);
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async subscribeToPush() {
    if (!this.swRegistration || !this.applicationServerKey) {
      console.log('Service worker or VAPID key not ready');
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.applicationServerKey)
      });
      await API.request('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription)
      });

      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  async unsubscribeFromPush() {
    if (!this.swRegistration) return false;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await API.request('/api/push/unsubscribe', { method: 'POST' });
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  showLocalNotification(title, options) {
    if (this.permission !== 'granted') return;

    if (this.swRegistration) {
      this.swRegistration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  }
}

export default new NotificationManager();