// Cloudflare Worker adresi (worker/eori-proxy.js). Boşsa EORI doğrulama yalnızca AB sayfasını açar.
export const EORI_PROXY_URL='https://eori-proxy.atakankolbasi.workers.dev';
// Yapay zekâ (Gemini) ile PDF okuma için Cloudflare Worker adresi (worker/gemini-proxy.js). Boşsa bu özellik kapalıdır.
export const AI_PROXY_URL='https://pcs-ai.atakankolbasi.workers.dev';
// VKN (vergi numarası) ile firma unvanı sorgusu için Cloudflare Worker adresi (worker/vkn-proxy.js). Boşsa "VKN'den getir" düğmesi çalışmaz.
export const VKN_PROXY_URL='https://vkn-proxy.atakankolbasi.workers.dev';
// Gümrük (Ticaret Bakanlığı) servisleri için aracı Cloudflare Worker adresi (worker/gtb-proxy.js). Boşsa canlı bağlantı düğmeleri çalışmaz; Ayarlar → Gümrük bağlantısı'ndan da yazılabilir.
// PORTAL-BİLGE için güvenli aracı Worker adresi. Boş bırakılırsa yalnızca hazırlık dosyası üretilir.
export const GTB_PROXY_URL='';
export const PORTAL_BILGE_URL='https://bgp-portal.ticaret.gov.tr/';
