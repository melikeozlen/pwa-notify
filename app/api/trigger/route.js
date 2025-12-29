import webPush from 'web-push';
import { getAllSubscriptions } from '../subscriptions';
import path from 'path';

// VAPID keys - .env.local dosyasından yüklenir
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BIQliiuXt2zwsX_Z_4korBFme7AL3_mQaqm7RkFXckII2wVSBRXPv0GUWGHKHtbYGBk04wiTPmnTvhDZgkrfRQw';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '_FwnEYy-tYQgL1jAa6aieMQj0WrFdVAuOZdwuMUXeXc';

webPush.setVapidDetails(
  'mailto:test@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function GET(req) {
  try {
    // URL parametrelerini al
    const { searchParams } = new URL(req.url);
    const message = searchParams.get('message') || 'Yeni bir bildiriminiz var!';
    const title = searchParams.get('title') || '🔔 Bildirim';

    // Kaydedilmiş tüm subscription'ları al
    const subscriptions = getAllSubscriptions();
    console.log('Toplam subscription sayısı:', subscriptions.length);
    console.log('Subscription dosyası yolu:', path.join(process.cwd(), 'subscriptions.json'));

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Henüz hiç subscription kaydedilmemiş. Önce uygulamadan abone olun.' 
        }), 
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Bildirim verisi
    const notificationPayload = JSON.stringify({
      title: title,
      body: message,
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      tag: 'triggered-notification',
      requireInteraction: false
    });

    // Tüm subscription'lara bildirim gönder
    const results = await Promise.allSettled(
      subscriptions.map(subscription => 
        webPush.sendNotification(subscription, notificationPayload)
      )
    );

    // Başarılı ve başarısız sayıları
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Bildirim gönderildi!`,
        details: {
          total: subscriptions.length,
          successful: successful,
          failed: failed
        }
      }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('Bildirim tetikleme hatası:', err);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Bildirim gönderilemedi',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

