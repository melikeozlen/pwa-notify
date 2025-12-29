// Service Worker - Push Bildirimleri için

let autoNotificationInterval = null;
let currentIntervalSeconds = 1;
let currentSubscription = null;

// IndexedDB utility fonksiyonları
const DB_NAME = 'NotificationDB';
const DB_VERSION = 1;
const STORE_NAME = 'autoNotification';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const loadAutoNotificationState = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('autoNotificationState');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB okuma hatası:', error);
    return null;
  }
};

const sendNotificationFromSW = async (subscription) => {
  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    
    if (response.ok) {
      console.log('Service Worker: Bildirim gönderildi');
    }
  } catch (error) {
    console.error('Service Worker: Bildirim gönderme hatası:', error);
  }
};

const startAutoNotification = (intervalSeconds, subscription) => {
  stopAutoNotification(); // Önceki interval'i temizle
  
  currentIntervalSeconds = intervalSeconds;
  currentSubscription = subscription;
  
  console.log(`Service Worker: Otomatik bildirim başlatıldı - Her ${intervalSeconds} saniyede bir`);
  
  // İlk bildirimi hemen gönder
  sendNotificationFromSW(subscription);
  
  // Sonra periyodik olarak gönder
  autoNotificationInterval = setInterval(() => {
    sendNotificationFromSW(subscription);
  }, intervalSeconds * 1000);
};

const stopAutoNotification = () => {
  if (autoNotificationInterval) {
    clearInterval(autoNotificationInterval);
    autoNotificationInterval = null;
    console.log('Service Worker: Otomatik bildirim durduruldu');
  }
};

// Service Worker yüklendiğinde
self.addEventListener('install', (event) => {
  console.log('Service Worker yüklendi');
  self.skipWaiting();
});

// Service Worker aktif olduğunda
self.addEventListener('activate', async (event) => {
  console.log('Service Worker aktif');
  event.waitUntil(self.clients.claim());
  
  // Kaydedilmiş durumu yükle
  const savedState = await loadAutoNotificationState();
  if (savedState && savedState.isActive && savedState.subscription) {
    startAutoNotification(savedState.intervalSeconds, savedState.subscription);
  }
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

// Frontend'den mesaj alındığında
self.addEventListener('message', (event) => {
  console.log('Service Worker: Mesaj alındı', event.data);
  
  if (event.data.type === 'START_AUTO_NOTIFICATION') {
    startAutoNotification(event.data.intervalSeconds, event.data.subscription);
  } else if (event.data.type === 'STOP_AUTO_NOTIFICATION') {
    stopAutoNotification();
  } else if (event.data.type === 'UPDATE_INTERVAL') {
    if (currentSubscription) {
      startAutoNotification(event.data.intervalSeconds, currentSubscription);
    }
  } else if (event.data.type === 'RESET') {
    stopAutoNotification();
    currentSubscription = null;
    currentIntervalSeconds = 1;
    console.log('Service Worker: Reset tamamlandı');
  }
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
