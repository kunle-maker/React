self.addEventListener('push', function(event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'VesselX',
        body: event.data.text(),
        icon: '/vesselx-logo.png',
        badge: '/vesselx-logo.png'
      };
    }
  }

  const options = {
    body: data.body || 'You have a new message',
    icon: data.icon || '/vesselx-logo.png',
    badge: data.badge || '/vesselx-logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      type: data.type || 'message',
      conversationId: data.conversationId,
      senderId: data.senderId
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ],
    tag: data.tag || 'vesselx-notification',
    renotify: true,
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'VesselX', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification was closed', event.notification);
});