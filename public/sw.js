// Service Worker - Push Bildirimleri için

// Service Worker yüklendiğinde
self.addEventListener('install', (event) => {
  console.log('Service Worker yüklendi');
  self.skipWaiting();
});

// Service Worker aktif olduğunda
self.addEventListener('activate', (event) => {
  console.log('Service Worker aktif');
  event.waitUntil(self.clients.claim());
});

// Push bildirimi geldiğinde
self.addEventListener('push', (event) => {
  console.log('Push bildirimi alındı');
  
  let notificationData = {
    title: 'Bildirim',
    body: 'Yeni bir bildiriminiz var!',
      icon: '/icon.svg',
      badge: '/icon.svg',
    tag: 'default',
    requireInteraction: false
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: [200, 100, 200],
      data: notificationData
    })
  );
});

// Bildirime tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('Bildirime tıklandı');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Eğer bir pencere zaten açıksa, ona odaklan
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Yoksa yeni bir pencere aç
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
