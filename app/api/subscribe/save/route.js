import { saveSubscription } from '../../subscriptions';

// Sadece subscription kaydetmek için endpoint (bildirim göndermez)
export async function POST(req) {
  try {
    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Geçersiz subscription' 
        }), 
        { status: 400 }
      );
    }

    // Subscription'ı kaydet
    const saved = saveSubscription(subscription);
    
    if (!saved) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Subscription kaydedilemedi' 
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription başarıyla kaydedildi!' 
      }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('Subscription kaydetme hatası:', err);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Subscription kaydedilemedi',
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

