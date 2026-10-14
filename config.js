// Cloudflare Worker adresi (worker/eori-proxy.js). Boşsa EORI doğrulama yalnızca AB sayfasını açar.
export const EORI_PROXY_URL='https://eori-proxy.atakankolbasi.workers.dev';
// Yapay zekâ (Gemini) ile PDF okuma için Cloudflare Worker adresi (worker/gemini-proxy.js). Boşsa bu özellik kapalıdır.
export const AI_PROXY_URL='';
