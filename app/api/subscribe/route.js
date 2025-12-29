import webPush from 'web-push';

// VAPID keys - .env.local dosyasından yüklenir
// Kendi key'lerinizi oluşturmak için: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BIQliiuXt2zwsX_Z_4korBFme7AL3_mQaqm7RkFXckII2wVSBRXPv0GUWGHKHtbYGBk04wiTPmnTvhDZgkrfRQw';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '_FwnEYy-tYQgL1jAa6aieMQj0WrFdVAuOZdwuMUXeXc';

webPush.setVapidDetails(
  'mailto:test@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function POST(req) {
  try {
    const subscription = await req.json();

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription gerekli' }), 
        { status: 400 }
      );
    }

    // Push bildirimi gönder
    await webPush.sendNotification(subscription, JSON.stringify({
      title: '🎉 Test Bildirimi',
      body: 'Push bildirimi başarıyla çalışıyor! Telefonunuza bildirim düştü mü?',
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      tag: 'test-notification',
      requireInteraction: false
    }));

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Bildirim başarıyla gönderildi!' 
      }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('Push bildirimi gönderme hatası:', err);
    
    // Daha detaylı hata mesajı
    let errorMessage = 'Bildirim gönderilemedi';
    if (err.statusCode === 410) {
      errorMessage = 'Subscription artık geçersiz. Lütfen tekrar abone olun.';
    } else if (err.statusCode === 429) {
      errorMessage = 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
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
