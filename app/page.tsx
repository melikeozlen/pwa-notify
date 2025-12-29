'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Tarayıcı desteğini kontrol et
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker kayıtlı:', registration);

      // Mevcut subscription'ı kontrol et
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
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
      setMessage('Push bildirimleri için abone olundu!');
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
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        setMessage('Bildirim gönderildi! Telefonunuza bakın.');
      } else {
        const error = await response.json();
        setMessage('Bildirim gönderilemedi: ' + (error.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
      setMessage('Bildirim gönderme hatası oluştu.');
    } finally {
      setIsLoading(false);
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
              <button
                onClick={subscribeToPush}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
              >
                Push Bildirimlerine Abone Ol
              </button>
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
              <button
                onClick={sendTestNotification}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
              >
                {isLoading ? 'Gönderiliyor...' : 'Push Bildirimi Gönder'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Bu uygulama PWA olarak yüklenebilir ve push bildirimleri gönderebilir.
          </p>
        </div>
      </div>
    </div>
  );
}
