// Subscription'ları saklamak için basit bir dosya tabanlı sistem
// Production'da database kullanılmalı
import fs from 'fs';
import path from 'path';

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'subscriptions.json');

// Subscription'ları yükle
export function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Subscription yükleme hatası:', error);
  }
  return [];
}

// Subscription kaydet
export function saveSubscription(subscription) {
  try {
    if (!subscription || !subscription.endpoint) {
      console.error('Geçersiz subscription:', subscription);
      return false;
    }

    const subscriptions = loadSubscriptions();
    console.log('Mevcut subscription sayısı:', subscriptions.length);
    
    // Aynı subscription varsa güncelle, yoksa ekle
    const existingIndex = subscriptions.findIndex(
      sub => sub && sub.endpoint === subscription.endpoint
    );
    
    if (existingIndex >= 0) {
      subscriptions[existingIndex] = subscription;
      console.log('Subscription güncellendi:', subscription.endpoint);
    } else {
      subscriptions.push(subscription);
      console.log('Yeni subscription eklendi:', subscription.endpoint);
    }
    
    const filePath = SUBSCRIPTIONS_FILE;
    console.log('Subscription dosyasına yazılıyor:', filePath);
    fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2), 'utf8');
    console.log('Subscription başarıyla kaydedildi. Toplam:', subscriptions.length);
    return true;
  } catch (error) {
    console.error('Subscription kaydetme hatası:', error);
    console.error('Hata detayı:', error.message);
    console.error('Dosya yolu:', SUBSCRIPTIONS_FILE);
    return false;
  }
}

// Tüm subscription'ları getir
export function getAllSubscriptions() {
  return loadSubscriptions();
}

