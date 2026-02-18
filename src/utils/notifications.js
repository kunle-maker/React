class NotificationManager {
  constructor() {
    this.initialized = false;
    this.permission = Notification.permission;
  }

  async initialize() {
    if (this.initialized) return;
    try {
      await window.OneSignal?.Deferred?.initialize?.({
        appId: "526a0072-47bb-404e-934b-7636ea55e356",
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
      });
      this.initialized = true;
    } catch (error) {
      console.error('OneSignal init failed:', error);
    }
  }

  async requestPermission() {
    if (!window.OneSignal) return false;
    try {
      const result = await window.OneSignal.Notifications.requestPermission();
      this.permission = result ? 'granted' : 'denied';
      return result;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  async subscribeToPush() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && window.OneSignal) {
      await window.OneSignal.User.addTag('userId', user._id);
    }
    return true;
  }

  async unsubscribeFromPush() {
    if (!window.OneSignal) return false;
    await window.OneSignal.Notifications.setSubscription(false);
    return true;
  }

  showLocalNotification(title, options) {
    if (this.permission !== 'granted') return;
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  }
}

export default new NotificationManager();