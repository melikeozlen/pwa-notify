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
    const subscriptions = loadSubscriptions();
    
    // Aynı subscription varsa güncelle, yoksa ekle
    const existingIndex = subscriptions.findIndex(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (existingIndex >= 0) {
      subscriptions[existingIndex] = subscription;
    } else {
      subscriptions.push(subscription);
    }
    
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    return true;
  } catch (error) {
    console.error('Subscription kaydetme hatası:', error);
    return false;
  }
}

// Tüm subscription'ları getir
export function getAllSubscriptions() {
  return loadSubscriptions();
}

