class NotificationManager {
  constructor() {
    this.initialized = false;
    this.permission = Notification.permission;
    this.swRegistration = null;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      if ('serviceWorker' in navigator) {
        this.swRegistration = await navigator.serviceWorker.ready;
      }
      
      if (window.OneSignal) {
        await window.OneSignal.init({
          appId: "526a0072-47bb-404e-934b-7636ea55e356",
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: 'OneSignalSDKWorker.js',
        });
        this.initialized = true;
      }
    } catch (error) {
      console.error('Notification init failed:', error);
    }
  }

  async setExternalUserId(userId) {
    if (!window.OneSignal) return;
    try {
      await window.OneSignal.setExternalUserId(userId);
    } catch (error) {
      console.error('Set external user ID failed:', error);
    }
  }

  async removeExternalUserId() {
    if (!window.OneSignal) return;
    try {
      await window.OneSignal.removeExternalUserId();
    } catch (error) {
      console.error('Remove external user ID failed:', error);
    }
  }

  async requestPermission() {
    if (!window.OneSignal) {
      // Fallback to standard notification API
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }
    
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
    
    // Subscribe via service worker
    if (this.swRegistration) {
      try {
        const subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            'YOUR_PUBLIC_VAPID_KEY' // Replace with your VAPID key
          )
        });
        console.log('Push subscription:', subscription);
      } catch (error) {
        console.error('Push subscription failed:', error);
      }
    }
    
    return true;
  }

  async unsubscribeFromPush() {
    if (!window.OneSignal) return false;
    await window.OneSignal.Notifications.setSubscription(false);
    
    // Unsubscribe from push
    if (this.swRegistration) {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }
    
    return true;
  }

  showLocalNotification(title, options) {
    if (this.permission !== 'granted') return;
    
    const notificationOptions = {
      ...options,
      icon: options.icon || '/vesselx-logo.png',
      badge: options.badge || '/vesselx-logo.png',
      vibrate: options.vibrate || [200, 100, 200],
      requireInteraction: options.requireInteraction || true,
      silent: options.silent || false
    };
    
    if (this.swRegistration) {
      this.swRegistration.showNotification(title, notificationOptions);
    } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, notificationOptions);
      });
    } else {
      new Notification(title, notificationOptions);
    }
  }

  // Helper to convert base64 to Uint8Array for VAPID key
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
}

export default new NotificationManager();