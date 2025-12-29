import fs from 'fs';
import path from 'path';

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'subscriptions.json');

// Tüm subscription'ları temizle
export async function POST(req) {
  try {
    console.log('🔄 Reset isteği alındı');
    
    // subscriptions.json dosyasını temizle
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
      console.log('✅ subscriptions.json temizlendi');
    } else {
      console.log('ℹ️ subscriptions.json dosyası zaten yok');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Tüm subscription\'lar temizlendi!' 
      }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('❌ Reset hatası:', err);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Reset başarısız oldu',
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

