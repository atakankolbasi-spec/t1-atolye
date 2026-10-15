# VKN sorgu bağlantısı (vknsorgula.net)

1. Cloudflare → Workers & Pages → Create → Hello World → ad: `vkn-proxy` → Deploy → Edit code.
2. `worker/vkn-proxy.js` dosyasının tamamını yapıştırın → Deploy.
3. Worker → Settings → Variables and Secrets → Add → **Type: Secret**, ad `VKN_API_KEY`, değer: vknsorgula.net API anahtarınız → Deploy.
4. (İsteğe bağlı) `ACCESS_CODE` adlı bir secret daha ekleyin; sitede ilk sorguda kod sorulur.
5. Worker adresini `config.js` içindeki `VKN_PROXY_URL` satırına yazın.

Aynı VKN 30 gün boyunca Worker'da, ayrıca tarayıcıda saklanır; sorgu hakkı tekrar harcanmaz.
