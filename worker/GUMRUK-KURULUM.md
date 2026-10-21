# Gümrük bağlantısı kurulumu (hat bildirimi + beyanname durumu)

Bu Worker, sitenin gümrük servislerine **kullanıcı adı ve şifreyi siteye yazmadan** bağlanmasını sağlar.
Şifreler yalnızca Cloudflare'de "Secret" olarak durur.

## 1. Worker'ı oluştur
1. Cloudflare → Workers & Pages → Create → Hello World → ad: `gtb-proxy` → Deploy.
2. **Edit code** → eski kodu sil → `worker/gtb-proxy.js` dosyasının tamamını yapıştır → **Deploy**.

## 2. Secret'ları gir (Settings → Variables and Secrets → Add → tür: **Secret**)
| Ad | Ne | Hangi özellik için |
|---|---|---|
| `IGHB_USER` | Hat bildirimi servisi kullanıcı adı | Hat bildirimi gönderme |
| `IGHB_PASS` | Hat bildirimi servisi şifresi | Hat bildirimi gönderme |
| `MUSAVIR_TC` | Müşavir TC kimlik no | Beyanname durumu / hat rengi sorgusu |
| `MUSAVIR_SIFRE` | Müşavir şifresi | Beyanname durumu / hat rengi sorgusu |
| `ACCESS_CODE` | (isteğe bağlı) Siteye girerken sorulacak kod | Başkası Worker'ı kullanmasın diye |

Şifreleri sohbete, e-postaya ya da koda yazma; yalnızca bu alana gir.

## 3. Siteye adresi yaz
Ayarlar → **Gümrük bağlantısı** → "Aracı servis adresi" = Worker adresi (`https://gtb-proxy.….workers.dev`),
"İzinli gönderici vergi no" = firmanın 10 haneli vergi numarası.

## 4. Dene
- **Hat bildirimleri** sayfasında bir kaydın satırındaki **🔍** (durum sorgula) ve **🛰** (resmî gönder) düğmeleri.
- İlk denemede 🔍 ile başla: yalnızca okur, hiçbir şey göndermez.

## Bilmen gerekenler
- Hat bildirimi servisi (`ws.gtb.gov.tr:8443`) ve Beyanname API için gümrükten yetki gerekir.
- Gümrük sunucusu Cloudflare'in adreslerini kabul etmeyebilir. Bu durumda "servis hata verdi / ulaşılamadı" mesajı alırsın; hatanın metnini destek hattına göster.
- 🛰 gerçek bildirim gönderir; göndermeden önce onay sorar.
