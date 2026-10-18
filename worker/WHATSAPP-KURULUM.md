# WhatsApp otomatik mesaj kurulumu (isteğe bağlı)

**Kurulum yapmadan da çalışır:** Hat kaydına Mavi / Sarı / Kırmızı seçince mesaj WhatsApp'ta hazır açılır; sen sadece "Gönder"e basarsın.
Aşağıdaki kurulum, mesajın **basmadan, kendiliğinden** gitmesi içindir. Meta (Facebook) hesabı ve WhatsApp Business gerekir.

1. https://developers.facebook.com → bir uygulama oluştur → **WhatsApp** ürününü ekle (WhatsApp Business Cloud API).
2. Bir telefon numarası ekle ve **Phone number ID**'yi not al.
3. Kalıcı erişim anahtarı üret (Business Settings → System Users → token).
4. **Mesaj şablonu** oluştur (Meta onayı gerekir, birkaç dakika–gün sürer):
   - Ad: `hat_bildirimi`, dil: Türkçe, tür: Utility
   - Metin: `{{1}} Hat bildirimi yapılmıştır. {{2}} Hattan işlem görecektir.`
   - Neden şablon: Meta, işletmenin ilk yazdığı mesajlarda onaylı şablon şart koşar.
5. Cloudflare → Workers & Pages → Create → Hello World → ad: `whatsapp-proxy` → Deploy → Edit code → `worker/whatsapp-proxy.js` içeriğini yapıştır → Deploy.
6. Worker → Settings → Variables and Secrets:
   - **Secret** `WA_TOKEN` = erişim anahtarı
   - **Secret** `WA_PHONE_ID` = Phone number ID
   - **Variable** `WA_TO` = mesaj gidecek numaralar, virgülle (örn. `905321234567`)
7. Worker adresini sitede **Ayarlar → WhatsApp → Otomatik gönderim servisi** alanına yaz.

Güvenlik: Worker yalnızca `WA_TO` listesindeki numaralara ve yalnızca bu siteden gelen isteklere mesaj yollar.
