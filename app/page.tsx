'use client';

import { useState, useEffect } from 'react';

// IndexedDB utility fonksiyonları
const DB_NAME = 'NotificationDB';
const DB_VERSION = 1;
const STORE_NAME = 'autoNotification';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveAutoNotificationState = async (state: {
  isActive: boolean;
  intervalSeconds: number;
  subscription: PushSubscription;
  notificationCount: number;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    openDB()
      .then(db => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(state, 'autoNotificationState');
        
        request.onsuccess = () => {
          console.log('IndexedDB kayıt başarılı:', state);
          resolve();
        };
        
        request.onerror = () => {
          console.error('IndexedDB kayıt hatası:', request.error);
          reject(request.error);
        };
        
        transaction.oncomplete = () => {
          console.log('Transaction tamamlandı');
        };
        
        transaction.onerror = () => {
          console.error('Transaction hatası:', transaction.error);
          reject(transaction.error);
        };
      })
      .catch(reject);
  });
};

const loadAutoNotificationState = async (): Promise<{
  isActive: boolean;
  intervalSeconds: number;
  subscription: PushSubscription | null;
  notificationCount: number;
} | null> => {
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

const clearAutoNotificationState = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    openDB()
      .then(db => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete('autoNotificationState');
        
        request.onsuccess = () => {
          console.log('IndexedDB temizlendi');
          resolve();
        };
        
        request.onerror = () => {
          console.error('IndexedDB silme hatası:', request.error);
          reject(request.error);
        };
        
        transaction.onerror = () => {
          console.error('Transaction hatası:', transaction.error);
          reject(transaction.error);
        };
      })
      .catch(reject);
  });
};

export default function Home() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState<number>(1);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Tarayıcı desteğini kontrol et
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  // Kaydedilmiş durumu yükle
  const loadSavedState = async () => {
    try {
      const savedState = await loadAutoNotificationState();
      console.log('Kaydedilmiş durum yüklendi:', savedState);
      
      if (savedState && savedState.isActive) {
        // Subscription'ı kontrol et
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        
        if (sub) {
          // Subscription varsa durumu yükle
          setSubscription(sub);
          setIntervalSeconds(savedState.intervalSeconds || 1);
          setNotificationCount(savedState.notificationCount || 0);
          setIsAutoSending(true);
          setMessage(`Otomatik bildirim devam ediyor. Her ${savedState.intervalSeconds || 1} saniyede bir gönderiliyor.`);
          
          console.log('Otomatik bildirim durumu yüklendi:', {
            intervalSeconds: savedState.intervalSeconds,
            notificationCount: savedState.notificationCount
          });
          
          // Service Worker'a durumu bildir
          if (registration.active) {
            registration.active.postMessage({
              type: 'START_AUTO_NOTIFICATION',
              intervalSeconds: savedState.intervalSeconds || 1,
              subscription: sub
            });
          }
        } else {
          // Subscription yoksa kaydedilmiş durumu temizle
          console.log('Subscription bulunamadı, kaydedilmiş durum temizleniyor');
          await clearAutoNotificationState();
        }
      }
    } catch (error) {
      console.error('Kaydedilmiş durum yüklenirken hata:', error);
    }
  };

  // Periyodik bildirim gönderme (sadece uygulama açıkken)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isAutoSending && subscription && permission === 'granted') {
      // Bildirim gönderme fonksiyonu
      const sendNotification = async () => {
        if (!subscription) return;

        try {
          // Subscription'ı JSON'a çevir
          const subscriptionJson = JSON.parse(JSON.stringify(subscription));
          
          const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionJson),
          });

          if (response.ok) {
            setNotificationCount(prev => {
              const newCount = prev + 1;
              // IndexedDB'yi güncelle
              if (subscription) {
                saveAutoNotificationState({
                  isActive: true,
                  intervalSeconds,
                  subscription: subscription as any,
                  notificationCount: newCount
                });
              }
              return newCount;
            });
          }
        } catch (error) {
          console.error('Bildirim gönderme hatası:', error);
        }
      };

      // İlk bildirimi hemen gönder
      sendNotification();
      
      // Sonra belirli aralıklarla gönder
      intervalId = setInterval(() => {
        sendNotification();
      }, intervalSeconds * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoSending, intervalSeconds, subscription, permission]);

  // intervalSeconds değiştiğinde IndexedDB'yi güncelle
  useEffect(() => {
    if (isAutoSending && subscription) {
      saveAutoNotificationState({
        isActive: true,
        intervalSeconds,
        subscription: subscription as any,
        notificationCount
      }).catch(error => {
        console.error('IndexedDB güncelleme hatası:', error);
      });
      
      // Service Worker'a güncelleme gönder
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'UPDATE_INTERVAL',
            intervalSeconds
          });
        }
      });
    }
  }, [intervalSeconds, isAutoSending, subscription, notificationCount]);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker kayıtlı:', registration);

      // Mevcut subscription'ı kontrol et
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        
        // Mevcut subscription'ı backend'e kaydet (eğer kaydedilmemişse)
        try {
          const subscriptionJson = JSON.parse(JSON.stringify(sub));
          const saveResponse = await fetch('/api/subscribe/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionJson),
          });
          
          if (saveResponse.ok) {
            console.log('Mevcut subscription backend\'e kaydedildi');
          }
        } catch (saveError) {
          console.error('Mevcut subscription kaydetme hatası:', saveError);
        }
        
        // Subscription yüklendikten sonra kaydedilmiş durumu yükle
        setTimeout(() => {
          loadSavedState();
        }, 500);
      } else {
        // Subscription yoksa da kaydedilmiş durumu kontrol et
        loadSavedState();
      }
    } catch (error) {
      console.error('Service Worker kaydı başarısız:', error);
      setMessage('Service Worker kaydı başarısız oldu.');
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setMessage('Bu tarayıcı bildirimleri desteklemiyor.');
      return;
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);

    if (permission === 'granted') {
      setMessage('Bildirim izni verildi!');
      await subscribeToPush();
    } else {
      setMessage('Bildirim izni reddedildi.');
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BIQliiuXt2zwsX_Z_4korBFme7AL3_mQaqm7RkFXckII2wVSBRXPv0GUWGHKHtbYGBk04wiTPmnTvhDZgkrfRQw'
        )
      });
      setSubscription(sub);
      
      // Subscription'ı backend'e kaydet
      try {
        const subscriptionJson = JSON.parse(JSON.stringify(sub));
        const saveResponse = await fetch('/api/subscribe/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscriptionJson),
        });
        
        if (saveResponse.ok) {
          console.log('Subscription backend\'e kaydedildi');
          setMessage('Push bildirimleri için abone olundu ve kaydedildi! Artık server\'dan bildirim gönderebilirsiniz.');
        } else {
          console.error('Subscription kaydedilemedi');
          setMessage('Push bildirimleri için abone olundu ancak kaydedilemedi.');
        }
      } catch (saveError) {
        console.error('Subscription kaydetme hatası:', saveError);
        setMessage('Push bildirimleri için abone olundu ancak kaydetme sırasında hata oluştu.');
      }
      
      // Subscription yüklendikten sonra kaydedilmiş durumu kontrol et
      setTimeout(() => {
        loadSavedState();
      }, 300);
    } catch (error) {
      console.error('Push aboneliği başarısız:', error);
      setMessage('Push aboneliği başarısız oldu.');
    }
  };

  const sendTestNotification = async () => {
    if (!subscription) {
      setMessage('Önce bildirim izni vermelisiniz!');
      return;
    }

    setIsLoading(true);
    try {
      // Subscription'ı JSON'a çevir
      const subscriptionJson = JSON.parse(JSON.stringify(subscription));
      console.log('Gönderilen subscription:', subscriptionJson);
      
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionJson),
      });

      if (response.ok) {
        if (!isAutoSending) {
          setMessage('Bildirim gönderildi! Telefonunuza bakın.');
        }
      } else {
        const error = await response.json();
        if (!isAutoSending) {
          setMessage('Bildirim gönderilemedi: ' + (error.error || 'Bilinmeyen hata'));
        }
      }
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
      if (!isAutoSending) {
        setMessage('Bildirim gönderme hatası oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoSending = async () => {
    if (!subscription || permission !== 'granted') {
      setMessage('Önce bildirim izni vermelisiniz!');
      return;
    }

    if (isAutoSending) {
      setIsAutoSending(false);
      setNotificationCount(0);
      setMessage('Otomatik bildirim gönderimi durduruldu.');
      await clearAutoNotificationState();
      
      // Service Worker'a durdur mesajı gönder
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: 'STOP_AUTO_NOTIFICATION'
        });
      }
    } else {
      setIsAutoSending(true);
      setNotificationCount(0);
      
      // IndexedDB'ye kaydet - ÖNCE kaydet, sonra mesaj göster
      try {
        await saveAutoNotificationState({
          isActive: true,
          intervalSeconds,
          subscription: subscription as any,
          notificationCount: 0
        });
        console.log('IndexedDB kayıt başarılı - Otomatik bildirim başlatıldı');
        setMessage(`Otomatik bildirim gönderimi başlatıldı. Her ${intervalSeconds} saniyede bir bildirim gönderilecek. Uygulamayı kapatabilirsiniz!`);
      } catch (error) {
        console.error('IndexedDB kayıt hatası:', error);
        setMessage('Otomatik bildirim başlatıldı ancak kayıt edilemedi. Lütfen tekrar deneyin.');
      }
      
      // Service Worker'a başlat mesajı gönder
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: 'START_AUTO_NOTIFICATION',
          intervalSeconds,
          subscription: subscription as any
        });
      }
    }
  };

  const sendLocalNotification = () => {
    if (permission !== 'granted') {
      setMessage('Önce bildirim izni vermelisiniz!');
      return;
    }

    const notificationOptions: NotificationOptions = {
      body: 'Bu yerel bir bildirim testidir!',
      icon: '/icon.svg',
      badge: '/icon.svg',
    };
    
    // vibrate özelliği TypeScript'te tanımlı değil, ancak tarayıcılar destekler
    (notificationOptions as any).vibrate = [200, 100, 200];
    
    new Notification('Test Bildirimi', notificationOptions);
    setMessage('Yerel bildirim gönderildi!');
  };

  // VAPID public key'i base64'ten Uint8Array'e çevir
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!isSupported) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Tarayıcı Desteği Yok
          </h1>
          <p className="text-gray-700">
            Bu tarayıcı push bildirimlerini desteklemiyor. Lütfen modern bir tarayıcı kullanın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          PWA Bildirim Testi
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Telefonunuza bildirim göndermek için test edin
        </p>

        <div className="space-y-4">
          {/* İzin Durumu */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Bildirim İzni:</p>
            <p className={`font-semibold ${
              permission === 'granted' ? 'text-green-600' : 
              permission === 'denied' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {permission === 'granted' ? '✅ Verildi' : 
               permission === 'denied' ? '❌ Reddedildi' : 
               '⏳ Beklemede'}
            </p>
          </div>

          {/* Abonelik Durumu */}
          {subscription && (
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Push Aboneliği:</p>
              <p className="font-semibold text-green-600">✅ Aktif</p>
            </div>
          )}

          {/* Otomatik Bildirim Gönderimi Durumu */}
          {isAutoSending && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Otomatik Bildirim:</p>
              <p className="font-semibold text-blue-600">
                🔄 Aktif - Her {intervalSeconds} saniyede bir gönderiliyor
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Gönderilen bildirim sayısı: {notificationCount}
              </p>
            </div>
          )}

          {/* Saniye Girişi */}
          {permission === 'granted' && subscription && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm text-gray-600 mb-2">
                Bildirim Aralığı (saniye):
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={intervalSeconds}
                onChange={async (e) => {
                  const value = parseInt(e.target.value) || 1;
                  const newValue = Math.max(1, Math.min(60, value));
                  setIntervalSeconds(newValue);
                  
                  // Eğer otomatik bildirim aktifse IndexedDB'ye kaydet
                  if (isAutoSending && subscription) {
                    try {
                      await saveAutoNotificationState({
                        isActive: true,
                        intervalSeconds: newValue,
                        subscription: subscription as any,
                        notificationCount
                      });
                      console.log('Süre değişikliği IndexedDB\'ye kaydedildi:', newValue);
                    } catch (error) {
                      console.error('Süre kaydetme hatası:', error);
                    }
                  }
                }}
                disabled={isAutoSending}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 1, maksimum 60 saniye
              </p>
            </div>
          )}

          {/* Mesaj */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes('başarı') || message.includes('gönderildi') 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Butonlar */}
          <div className="space-y-3">
            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
              >
                Bildirim İzni İste
              </button>
            )}

            {permission === 'granted' && !subscription && (
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-700">
                  ⏳ Push aboneliği oluşturuluyor...
                </p>
              </div>
            )}

            {permission === 'granted' && (
              <button
                onClick={sendLocalNotification}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
              >
                Yerel Bildirim Gönder
              </button>
            )}

            {subscription && (
              <>
                <button
                  onClick={sendTestNotification}
                  disabled={isLoading || isAutoSending}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
                >
                  {isLoading ? 'Gönderiliyor...' : 'Tek Bildirim Gönder'}
                </button>

                <button
                  onClick={toggleAutoSending}
                  disabled={isLoading}
                  className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors shadow-md ${
                    isAutoSending
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {isAutoSending ? '⏸️ Otomatik Bildirimi Durdur' : '▶️ Otomatik Bildirim Başlat'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
          {subscription && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                🌐 Uygulama Kapalıyken Bildirim Gönderme:
              </p>
              <p className="text-xs text-blue-700 mb-2">
                Tarayıcıda veya başka bir yerden şu URL'ye istek atarak bildirim gönderebilirsiniz:
              </p>
              <div className="bg-white rounded p-2 mb-2">
                <code className="text-xs break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/trigger?message=Merhaba
                </code>
              </div>
              <p className="text-xs text-blue-600">
                Örnek: <code className="bg-white px-1 rounded">/api/trigger?message=Test&title=Başlık</code>
              </p>
            </div>
          )}
          <p className="text-xs text-center text-gray-500">
            Bu uygulama PWA olarak yüklenebilir ve push bildirimleri gönderebilir.
          </p>
        </div>
      </div>
    </div>
  );
}
