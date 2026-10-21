# Sabit IP'li sunucuda (VPS) kurulum

Gümrük servisi Cloudflare adreslerini kabul etmezse, `gtb-proxy` aynı kodla küçük bir sunucuda çalışır.

## 1) Sunucu kirala
- Herhangi bir VPS sağlayıcısı (Hetzner, DigitalOcean, Contabo…), en ucuz paket yeterli.
- İşletim sistemi: **Ubuntu 24.04**. Sunucunun **IP adresini** not al (örnek: 203.0.113.7).
- Gümrük IP kısıtlıyorsa bu IP'yi onlara bildireceksin.

## 2) Sunucuya bağlan ve kur (komutları sırayla yapıştır)
```
apt update && apt install -y nodejs git caddy
git clone https://github.com/atakankolbasi-spec/t1-atolye.git /opt/t1
```
(Node sürümü 18'den küçükse: `apt install -y nodejs npm` yerine nodesource ile Node 20 kur.)

## 3) Şifreleri dosyaya yaz (sadece sunucuda durur)
`nano /etc/gtb.env` ile aç ve yaz:
```
IGHB_USER=...
IGHB_PASS=...
MUSAVIR_TC=...
MUSAVIR_SIFRE=...
ACCESS_CODE=
```
`chmod 600 /etc/gtb.env`

## 4) Servisi başlat
`nano /etc/systemd/system/gtb.service`:
```
[Unit]
Description=gtb-proxy
After=network.target
[Service]
EnvironmentFile=/etc/gtb.env
ExecStart=/usr/bin/node /opt/t1/worker/gtb-server.mjs
Restart=always
[Install]
WantedBy=multi-user.target
```
`systemctl enable --now gtb`

## 5) HTTPS adresi (site https olduğu için şart)
Alan adı almadan, IP'nden otomatik adres: `203-0-113-7.sslip.io` (IP'deki noktaları tire yap).
`nano /etc/caddy/Caddyfile` içeriğini şununla değiştir:
```
203-0-113-7.sslip.io {
  reverse_proxy 127.0.0.1:8787
}
```
`systemctl restart caddy`

## 6) Siteye bağla
Ayarlar → Gümrük bağlantısı → Araç servis adresi: `https://203-0-113-7.sslip.io`
