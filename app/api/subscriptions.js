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
    
    // Dizinin var olduğundan emin ol
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      console.log('Dizin mevcut değil, oluşturuluyor:', dir);
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Dosya yazma işlemi
    try {
      const data = JSON.stringify(subscriptions, null, 2);
      fs.writeFileSync(filePath, data, { encoding: 'utf8', flag: 'w' });
      console.log('✅ Subscription başarıyla kaydedildi. Toplam:', subscriptions.length);
      
      // Dosyanın yazıldığını doğrula
      if (fs.existsSync(filePath)) {
        const fileSize = fs.statSync(filePath).size;
        console.log('✅ Dosya doğrulandı, boyut:', fileSize, 'bytes');
        return true;
      } else {
        console.error('❌ Dosya yazıldı ama bulunamadı!');
        return false;
      }
    } catch (writeError) {
      console.error('❌ Dosya yazma hatası:', writeError);
      console.error('Hata kodu:', writeError.code);
      console.error('Hata mesajı:', writeError.message);
      
      // İzin hatası kontrolü
      if (writeError.code === 'EACCES' || writeError.code === 'EPERM') {
        console.error('❌ Dosya yazma izni yok!');
      } else if (writeError.code === 'ENOENT') {
        console.error('❌ Dizin bulunamadı!');
      } else if (writeError.code === 'ENOSPC') {
        console.error('❌ Disk dolu!');
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Subscription kaydetme hatası:', error);
    console.error('Hata detayı:', error.message);
    console.error('Hata kodu:', error.code);
    console.error('Dosya yolu:', SUBSCRIPTIONS_FILE);
    console.error('Çalışma dizini:', process.cwd());
    return false;
  }
}

// Tüm subscription'ları getir
export function getAllSubscriptions() {
  return loadSubscriptions();
}

