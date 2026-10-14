# EORI doğrulama aracısı (Cloudflare Worker)

Tarayıcıdaki site, AB'nin EORI doğrulama sayfasını doğrudan çağıramaz (CORS). Bu Worker araya girer:
siteden EORI numarasını alır, AB sayfasına sorar, sonucu JSON olarak geri verir.

## Kurulum (yaklaşık 5 dakika)

1. `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Create Worker** (Hello World şablonu).
2. Ad olarak `eori-proxy` yazın ve **Deploy** deyin.
3. **Edit code** düğmesine basın, soldaki dosyanın tüm içeriğini silin ve bu klasördeki `eori-proxy.js` dosyasının içeriğini yapıştırın. **Deploy** deyin.
4. Worker'ın adresini kopyalayın. Biçimi `https://eori-proxy.<hesap-adı>.workers.dev` şeklindedir.
5. Adresi Claude'a yazın. Claude `config.js` içindeki `EORI_PROXY_URL` değerine ekler.
   Hızlı deneme için adresi geçici olarak tarayıcıda şöyle de verebilirsiniz (Console'a yapıştırın):
   `localStorage.setItem('t1-eori-proxy','https://eori-proxy.<hesap-adı>.workers.dev')`

## Deneme

Tarayıcıda şu adresi açın (kendi Worker adresinizle):

`https://eori-proxy.<hesap-adı>.workers.dev/?eori=BGC204447680ZZZZ7`

Beklenen: `"valid":true` ve firma adı, adres, posta kodu, şehir, ülke.
Sonuç boş ya da hatalı gelirse adresin sonuna `&debug=1` ekleyin. AB sayfasından okunan satırlar da görünür, bu bilgiyle ayrıştırma düzeltilir.

## Notlar

- Yalnızca AB üyesi ülkelerin (ve Kuzey İrlanda `XI`) EORI numaraları doğrulanır. `TR` ve `GB` yoktur.
- Bazı ülkeler yalnızca geçerli/geçersiz bilgisini verir, ad ve adres göstermez.
- Worker yalnızca `https://atakankolbasi-spec.github.io` adresinden gelen tarayıcı isteklerine izin verir (`ALLOWED` listesi).
- Ücretsiz plan günde 100.000 istek sağlar.
