# PWA Bildirim Uygulaması

Basit bir Progressive Web App (PWA) bildirim test uygulaması. Telefonunuza push bildirimleri göndermek için kullanabilirsiniz.

## Özellikler

- ✅ Service Worker ile push bildirimleri
- ✅ PWA manifest dosyası
- ✅ Bildirim izni yönetimi
- ✅ Yerel ve push bildirim testleri
- ✅ Modern ve responsive arayüz

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. VAPID Keys oluşturun (isteğe bağlı, test için varsayılan key'ler kullanılabilir):
```bash
npx web-push generate-vapid-keys
```

Bu komut size public ve private key'ler verecek. Bunları `.env.local` dosyasına ekleyin:
```
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
```

3. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

4. Tarayıcıda `http://localhost:3000` adresini açın.

## Kullanım

1. **Bildirim İzni İste**: Sayfada "Bildirim İzni İste" butonuna tıklayın ve izin verin.

2. **Push Bildirimlerine Abone Ol**: İzin verildikten sonra "Push Bildirimlerine Abone Ol" butonuna tıklayın.

3. **Bildirim Gönder**: 
   - "Yerel Bildirim Gönder" - Tarayıcıda anında bildirim gösterir
   - "Push Bildirimi Gönder" - Service Worker üzerinden push bildirimi gönderir (telefonda çalışır)

## PWA Olarak Yükleme

### Android (Chrome)
1. Chrome tarayıcısında uygulamayı açın
2. Menüden "Ana ekrana ekle" seçeneğini seçin
3. Uygulama ana ekranınıza eklenecek

### iOS (Safari)
1. Safari'de uygulamayı açın
2. Paylaş butonuna tıklayın
3. "Ana Ekrana Ekle" seçeneğini seçin

## Önemli Notlar

- Push bildirimleri için HTTPS gereklidir (localhost hariç)
- Production'da mutlaka kendi VAPID key'lerinizi kullanın
- Service Worker sadece HTTPS veya localhost'ta çalışır
- Bazı tarayıcılar push bildirimlerini desteklemez

## Teknolojiler

- Next.js 16
- React 19
- Service Worker API
- Web Push API
- Tailwind CSS
