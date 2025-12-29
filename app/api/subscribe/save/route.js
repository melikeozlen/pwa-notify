import { saveSubscription } from '../../subscriptions';

// Sadece subscription kaydetmek için endpoint (bildirim göndermez)
export async function POST(req) {
  try {
    console.log('📥 Subscription kaydetme isteği alındı');
    const subscription = await req.json();
    console.log('📦 Subscription verisi:', {
      endpoint: subscription?.endpoint,
      keys: subscription?.keys ? 'var' : 'yok'
    });

    if (!subscription || !subscription.endpoint) {
      console.error('❌ Geçersiz subscription:', subscription);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Geçersiz subscription - endpoint bulunamadı',
          received: subscription ? 'Subscription var ama endpoint yok' : 'Subscription yok'
        }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log('💾 Subscription kaydediliyor...');
    // Subscription'ı kaydet
    const saved = saveSubscription(subscription);
    
    if (!saved) {
      console.error('❌ Subscription kaydetme başarısız oldu');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Subscription kaydedilemedi - dosya yazma hatası olabilir' 
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log('✅ Subscription başarıyla kaydedildi');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription başarıyla kaydedildi!',
        endpoint: subscription.endpoint
      }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('❌ Subscription kaydetme hatası:', err);
    console.error('Hata detayı:', err.message);
    console.error('Stack:', err.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Subscription kaydedilemedi',
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
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

