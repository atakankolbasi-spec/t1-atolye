# Yapay zekâ (Gemini) ile PDF okuma — kurulum

Site, PDF'i doğrudan Google'a gönderemez, çünkü API anahtarı sitede durursa herkes görür.
Bu yüzden Cloudflare'de ikinci bir küçük Worker (`pcs-ai`) kurulur. Anahtar yalnızca orada saklanır.

## 1) Gemini API anahtarı al (2 dakika)

1. `aistudio.google.com/apikey` adresini aç, Google hesabınla gir.
2. **Create API key** de, çıkan anahtarı kopyala.
3. Bu anahtarı **kimseye yazma, sohbete yapıştırma, GitHub'a koyma.**

## 2) Worker'ı kur (5 dakika)

1. `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Create Worker**.
2. Ad: `pcs-ai` → **Deploy**.
3. **Edit code** → soldaki yazının hepsini sil → bu klasördeki `gemini-proxy.js` dosyasının tamamını yapıştır → **Deploy**.
4. Worker sayfasında **Settings → Variables and Secrets → Add**:
   - Type: **Secret**, Name: `GEMINI_API_KEY`, Value: 1. adımdaki anahtar → **Deploy**.
   - (İsteğe bağlı ama önerilir) bir tane daha: Type **Secret**, Name `ACCESS_CODE`, Value: kendi belirlediğin kısa bir kod. Site ilk kullanımda bu kodu sorar.
5. Worker'ın adresini kopyala (`https://pcs-ai.<hesap>.workers.dev`).

## 3) Siteye bağla

Adresi Claude'a yaz; `config.js` içindeki `AI_PROXY_URL` alanına yazılır.
Denemek için tarayıcı Console'una yapıştırılabilir:
`localStorage.setItem('t1-ai-proxy','https://pcs-ai.<hesap>.workers.dev')`

## Gizlilik ve ücret

- PDF'in içindeki bilgiler (firma adları, tutarlar, adresler) Google'ın sunucularına gönderilir.
- Ücretsiz Gemini katmanında Google, gönderilen içeriği ürünlerini geliştirmek için kullanabilir. Müşteri belgeleri için **ücretli (faturalandırmalı) katman** kullanman daha güvenlidir. Ayrıntı için Google'ın "Gemini API additional terms" sayfasına bak.
- Model otomatik seçilir: önce `gemini-3.8-flash`, kapalıysa sırayla yedekleri denenir. Değiştirmek için Worker'a `GEMINI_MODEL` adlı bir değişken ekle.
- Her PDF okuması bir API isteğidir; ücretsiz katmanın günlük sınırı vardır.

## Kota (ücretsiz plan)
Google ücretsiz planda dakikalık/günlük istek sınırı uygular. Site büyük PDF'i 15 sayfalık parçalara bölüp sırayla gönderir, "çok istek" hatasında Google'ın söylediği süre kadar bekler; biten parçaları tarayıcıda saklar. Günlük kota dolarsa ya da anahtarda ücretsiz kota yoksa Google AI Studio'da faturalandırmayı açmak gerekir.
