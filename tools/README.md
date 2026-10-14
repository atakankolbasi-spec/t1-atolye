# Modaltrans firma listesini aktarma

`modaltrans-export.js`, Modaltrans'a giriş yapılmış tarayıcı sekmesinde çalışır, Firmalar listesini sayfa sayfa okur
ve tek bir JSON dosyası indirir. Dosya, sitedeki **Firmalar & GTİP → Firma listesi içe aktar** ile yüklenir.

- Veri yalnızca bu bilgisayarda kalır, hiçbir yere gönderilmez.
- Sunucuyu yormamamak için sayfalar arasında yarım saniye bekler (yaklaşık 46.000 firma için 1-1,5 saat).
- Parça parça almak için dosyanın başındaki `start` ve `end` değerlerini değiştirin.
- Durdurmak için Console'a `__mt.stop()` yazın. O ana kadarki firmalar indirilir.
- Oturum düşerse betik durur ve o ana kadarki firmaları indirir.
- İlerleme her 25 sayfada tarayıcıya kaydedilir. Sekme kapanırsa betiği aynı sekmede yeniden çalıştırmak kaldığı yerden devam eder. Baştan başlamak için önce `__mt.reset()` yazın.
- Çalışırken sekmeyi kapatmaya kalkarsanız tarayıcı uyarı gösterir.
